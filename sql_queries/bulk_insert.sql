/* =========[ A) STORAGE + SECURITY SETUP ]========= */
/* Edit only if you change account/container/token */
DECLARE 
  @StorageAccount sysname       = N'adventureworksacc',
  @Container      sysname       = N'csvfiles',
  @SasToken       nvarchar(max) = N'?sp=r&st=2025-08-23T16:20:24Z&se=2025-08-24T00:35:24Z&spr=https&sv=2024-11-04&sr=c&sig=798zmZm1IAir9hiMNQFPz9w9fSb6x1SctzbdIsbr%2BD0%3D';

IF NOT EXISTS (SELECT 1 FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
  CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'ChangeThis_StrongPassword_OnlyForThisDB!';

IF EXISTS (SELECT 1 FROM sys.database_scoped_credentials WHERE name = N'MyBlobSasCred')
  DROP DATABASE SCOPED CREDENTIAL [MyBlobSasCred];

DECLARE @sql nvarchar(max);

-- Create credential via dynamic SQL so we can inject @SasToken
SET @sql = N'CREATE DATABASE SCOPED CREDENTIAL [MyBlobSasCred]
WITH IDENTITY = ''SHARED ACCESS SIGNATURE'',
     SECRET   = N''' + REPLACE(@SasToken,'''','''''') + N''';';
EXEC(@sql);

IF EXISTS (SELECT 1 FROM sys.external_data_sources WHERE name = N'MyBlobStorage')
  DROP EXTERNAL DATA SOURCE [MyBlobStorage];

DECLARE @Location nvarchar(4000) =
  N'https://' + @StorageAccount + N'.blob.core.windows.net/' + @Container;

SET @sql = N'CREATE EXTERNAL DATA SOURCE [MyBlobStorage]
WITH (TYPE = BLOB_STORAGE, LOCATION = N''' + REPLACE(@Location,'''','''''') + N''', CREDENTIAL = [MyBlobSasCred]);';
EXEC(@sql);

-- Ensure schema exists (owned by dbo)
IF SCHEMA_ID(N'stg') IS NULL
  EXEC('CREATE SCHEMA stg AUTHORIZATION dbo;');
GO

/* =========[ B) PROC: READ HEADER, CREATE TABLE, BULK INSERT ]========= */
CREATE OR ALTER PROCEDURE stg.LoadCsvFromBlob
  @FileName   nvarchar(4000),      -- e.g., 'Sales.csv' or 'sub/folder/Sales.csv'
  @SchemaName sysname = N'stg',
  @TableName  sysname = NULL       -- default: derived from file name (basename without extension)
AS
BEGIN
  SET NOCOUNT ON;

  -- Derive table name if not provided
  IF @TableName IS NULL
  BEGIN
    DECLARE @pos int = CHARINDEX('.', REVERSE(@FileName));
    IF @pos > 0
      SET @TableName = LEFT(@FileName, LEN(@FileName) - @pos);
    ELSE
      SET @TableName = @FileName;
  END

  /* Read whole file as CLOB via dynamic SQL into temp table */
  DECLARE @clob nvarchar(max);
  CREATE TABLE #clob(txt nvarchar(max));
  DECLARE @sql nvarchar(max) = N'
    INSERT INTO #clob(txt)
    SELECT CONVERT(nvarchar(max), BulkColumn)
    FROM OPENROWSET(
           BULK ''' + REPLACE(@FileName,'''','''''') + ''',
           DATA_SOURCE = ''MyBlobStorage'',
           SINGLE_CLOB
         ) AS src;';
  EXEC(@sql);

  SELECT TOP 1 @clob = txt FROM #clob;
  DROP TABLE #clob;

  IF @clob IS NULL
  BEGIN
    RAISERROR('Could not read %s from external data source.', 16, 1, @FileName);
    RETURN;
  END

  /* Extract first line (header) */
  DECLARE @posCR int = CHARINDEX(CHAR(13), @clob);
  DECLARE @posLF int = CHARINDEX(CHAR(10), @clob);
  DECLARE @endLine int =
    CASE 
      WHEN @posCR > 0 AND @posLF > 0 THEN IIF(@posCR < @posLF, @posCR, @posLF)
      WHEN @posCR > 0 THEN @posCR
      WHEN @posLF > 0 THEN @posLF
      ELSE LEN(@clob) + 1
    END;

  DECLARE @header nvarchar(max) = SUBSTRING(@clob, 1, @endLine - 1);
  -- Strip UTF-8 BOM if present
  IF LEFT(@header,1) = NCHAR(65279) SET @header = SUBSTRING(@header,2, LEN(@header)-1);

  /* Split header by TAB; preserve order */
  CREATE TABLE #cols(Ord int, RawName nvarchar(4000));
  INSERT INTO #cols(Ord, RawName)
  SELECT ordinal, LTRIM(RTRIM(value))
  FROM STRING_SPLIT(@header, CHAR(9), 1)  -- 1 = return ordinal
  ORDER BY ordinal;

  /* Sanitize column names -> CleanName, dedupe with Ord if needed */
  CREATE TABLE #cols2(Ord int, CleanName nvarchar(4000), UniqueName nvarchar(4000));

  INSERT INTO #cols2(Ord, CleanName, UniqueName)
  SELECT Ord,
         -- basic cleanup: spaces, hyphens, slashes, dots, commas, parens, #, &
         REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
           ISNULL(NULLIF(RawName, N''), CONCAT(N'Col_', Ord)),
           N' ', N'_'), N'-', N'_'), N'/', N'_'), N'\', N'_'),
           N'.', N'_'), N',', N'_'), N'(', N'_'), N')', N'_'), N'#', N'_'), N'&', N'_') AS CleanName,
         NULL
  FROM #cols
  ORDER BY Ord;

  -- Ensure starts with non-digit
  UPDATE #cols2 SET CleanName = 'c_' + CleanName WHERE CleanName LIKE '[0-9]%';

  -- Deduplicate names if needed by appending Ord
  ;WITH d AS (
    SELECT CleanName FROM #cols2 GROUP BY CleanName HAVING COUNT(*) > 1
  )
  UPDATE c
    SET CleanName = c.CleanName + '_' + CAST(c.Ord AS varchar(10))
  FROM #cols2 c
  JOIN d ON d.CleanName = c.CleanName;

  UPDATE #cols2 SET UniqueName = CleanName;

  DECLARE @colsList nvarchar(max) =
    (SELECT STRING_AGG(QUOTENAME(UniqueName) + N' nvarchar(4000) NULL', N', ')
       WITHIN GROUP (ORDER BY Ord)
     FROM #cols2);

  IF @colsList IS NULL OR @colsList = N''
  BEGIN
    RAISERROR('Header parsing failed for %s.', 16, 1, @FileName);
    RETURN;
  END

  DECLARE @full nvarchar(512) = QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@TableName);

  -- Create table if not exists
  DECLARE @create nvarchar(max) = N'IF OBJECT_ID(''' + @full + N''',''U'') IS NULL
    CREATE TABLE ' + @full + N' (' + @colsList + N');';
  EXEC(@create);

  -- Truncate for idempotency
  EXEC(N'TRUNCATE TABLE ' + @full + N';');

  -- BULK INSERT with correct format
  DECLARE @bulk nvarchar(max) = N'
    BULK INSERT ' + @full + N'
    FROM ''' + REPLACE(@FileName,'''','''''') + N'''
    WITH (
      DATA_SOURCE     = ''MyBlobStorage'',
      FORMAT          = ''CSV'',
      FIRSTROW        = 2,
      FIELDTERMINATOR = ''\t'',
      ROWTERMINATOR   = ''0x0d0a'',
      TABLOCK
    );';
  EXEC(@bulk);

  -- Quick count
  DECLARE @cnt bigint;
  DECLARE @countSql nvarchar(max) = N'SELECT @c = COUNT(*) FROM ' + @full + N';';
  EXEC sp_executesql @countSql, N'@c bigint OUTPUT', @c=@cnt OUTPUT;

  PRINT CONCAT('Loaded ', @cnt, ' rows into ', @full, ' from ', @FileName);
END
GO

/* =========[ C) LOAD ALL 7 FILES ]========= */
/* If files are in subfolders, include relative paths, e.g., N'2025/Sales.csv' */
EXEC stg.LoadCsvFromBlob N'Product.csv'           , N'stg', N'Product';
EXEC stg.LoadCsvFromBlob N'Region.csv'            , N'stg', N'Region';
EXEC stg.LoadCsvFromBlob N'Reseller.csv'          , N'stg', N'Reseller';
EXEC stg.LoadCsvFromBlob N'Sales.csv'             , N'stg', N'Sales';
EXEC stg.LoadCsvFromBlob N'Salesperson.csv'       , N'stg', N'Salesperson';
EXEC stg.LoadCsvFromBlob N'SalespersonRegion.csv' , N'stg', N'SalespersonRegion';
EXEC stg.LoadCsvFromBlob N'Targets.csv'           , N'stg', N'Targets';

/* =========[ D) QUICK ROW COUNTS ]========= */
SELECT 'Product' AS TableName, COUNT(*) AS RowsLoaded FROM stg.Product UNION ALL
SELECT 'Region' , COUNT(*) FROM stg.Region UNION ALL
SELECT 'Reseller', COUNT(*) FROM stg.Reseller UNION ALL
SELECT 'Sales'   , COUNT(*) FROM stg.Sales UNION ALL
SELECT 'Salesperson', COUNT(*) FROM stg.Salesperson UNION ALL
SELECT 'SalespersonRegion', COUNT(*) FROM stg.SalespersonRegion UNION ALL
SELECT 'Targets', COUNT(*) FROM stg.Targets;
