CREATE OR ALTER PROCEDURE dbo.GetTotalSalesByMonth
  @MonthYear CHAR(7)  -- 'YYYY-MM'
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @StartDate date = DATEFROMPARTS(CONVERT(int, LEFT(@MonthYear,4)),
                                          CONVERT(int, RIGHT(@MonthYear,2)), 1);
  DECLARE @EndDate   date = DATEADD(month, 1, @StartDate);

  ;WITH SalesTyped AS (
    SELECT
      TRY_CONVERT(date,
        LTRIM(SUBSTRING(s.[OrderDate],
                        NULLIF(CHARINDEX(',', s.[OrderDate]),0) + 1, 4000)), 107) AS OrderDate_d,
      TRY_CONVERT(decimal(18,2),
        REPLACE(REPLACE(s.[Sales], '$', ''), ',', '')) AS Sales_d
    FROM stg.Sales s
    WHERE s.[OrderDate] IS NOT NULL
  )
  SELECT CAST(SUM(Sales_d) AS decimal(18,2)) AS TotalSales
  FROM SalesTyped
  WHERE OrderDate_d >= @StartDate
    AND OrderDate_d <  @EndDate;
END;
GO
