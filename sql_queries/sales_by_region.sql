CREATE OR ALTER PROCEDURE dbo.GetSalesByRegionByMonth
  @MonthYear CHAR(7)  -- 'YYYY-MM'
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @StartDate date = DATEFROMPARTS(CONVERT(int, LEFT(@MonthYear,4)),
                                          CONVERT(int, RIGHT(@MonthYear,2)), 1);
  DECLARE @EndDate   date = DATEADD(month, 1, @StartDate);

  /* Assumptions:
     - stg.Sales has: SalesTerritoryKey, OrderDate, Sales (currency string)
     - stg.Region has: SalesTerritoryKey, Region  (← if your column is named differently,
       e.g. TerritoryName or RegionName, replace [Region] below.)
  */

  ;WITH SalesTyped AS (
    SELECT
      s.SalesTerritoryKey,
      TRY_CONVERT(date,
        LTRIM(SUBSTRING(s.[OrderDate],
                        NULLIF(CHARINDEX(',', s.[OrderDate]),0) + 1, 4000)), 107) AS OrderDate_d,
      TRY_CONVERT(decimal(18,2),
        REPLACE(REPLACE(s.[Sales], '$', ''), ',', '')) AS Sales_d
    FROM stg.Sales s
    WHERE s.[OrderDate] IS NOT NULL
  )
  SELECT
    s.SalesTerritoryKey                                     AS RegionKey,
    COALESCE(r.[Region], CONCAT('Region ', s.SalesTerritoryKey)) AS RegionName,
    CAST(SUM(s.Sales_d) AS decimal(18,2))                   AS TotalSales
  FROM SalesTyped s
  LEFT JOIN stg.Region r
         ON r.SalesTerritoryKey = s.SalesTerritoryKey
  WHERE s.OrderDate_d >= @StartDate
    AND s.OrderDate_d <  @EndDate
  GROUP BY s.SalesTerritoryKey, r.[Region]
  ORDER BY TotalSales DESC;
END;
GO
