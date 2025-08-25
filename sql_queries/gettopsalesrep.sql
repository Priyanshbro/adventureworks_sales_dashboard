CREATE OR ALTER PROCEDURE dbo.GetTopSalesRepsByMonth
  @MonthYear char(7)   -- 'YYYY-MM'
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @StartDate date = TRY_CONVERT(date, @MonthYear + '-01');
  IF @StartDate IS NULL
  BEGIN
    RAISERROR('Invalid @MonthYear. Use format YYYY-MM (e.g., 2017-08).',16,1);
    RETURN;
  END
  DECLARE @NextMonth date = DATEADD(month, 1, @StartDate);

  ;WITH CleanSales AS (
    SELECT
      TRY_CONVERT(date, STUFF(OrderDate, 1, CHARINDEX(', ', OrderDate) + 1, '')) AS OrderDate_d,
      TRY_CONVERT(int, EmployeeKey) AS EmployeeKey_i,
      TRY_CONVERT(int, ResellerKey) AS ResellerKey_i,
      TRY_CONVERT(decimal(19,2), REPLACE(REPLACE([Sales], '$',''),',','')) AS Sales_amt
    FROM stg.Sales
  ),
  Filtered AS (
    SELECT * FROM CleanSales
    WHERE OrderDate_d >= @StartDate AND OrderDate_d < @NextMonth
  ),
  Agg AS (
    SELECT
      EmployeeKey_i AS SalesRepID,
      SUM(Sales_amt) AS TotalRevenue,
      COUNT(DISTINCT ResellerKey_i) AS CustomerCount
    FROM Filtered
    WHERE EmployeeKey_i IS NOT NULL
    GROUP BY EmployeeKey_i
  )
  SELECT TOP (10)
      A.SalesRepID,
      P.Salesperson AS FullName,
      A.TotalRevenue,
      A.CustomerCount
  FROM Agg A
  LEFT JOIN stg.Salesperson P
         ON TRY_CONVERT(int, P.EmployeeKey) = A.SalesRepID
  ORDER BY A.TotalRevenue DESC;
END
GO
