const sql = require("mssql");
const jwt = require("jsonwebtoken");

let pool;
/** Reuse a single SQL connection across invocations */
async function getPool() {
  if (pool?.connected) return pool;
  const connStr = process.env.SQL_CONNECTION_STRING;
  if (!connStr) throw new Error("Missing SQL_CONNECTION_STRING");
  pool = await sql.connect(connStr);
  return pool;
}

/** Minimal CORS helper */
function addCors(res) {
  res.headers = res.headers || {};
  res.headers["Access-Control-Allow-Origin"] =
    process.env.ALLOWED_ORIGIN || "*";
  res.headers["Access-Control-Allow-Headers"] =
    "Authorization, Content-Type";
  res.headers["Access-Control-Allow-Methods"] = "GET,OPTIONS";
}

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = { status: 200 };
    addCors(context.res);
    return;
  }

  try {
  // No authentication required

    // ---- Inputs ----
    const monthYear =
      req.query.monthYear ||
      (req.query.year &&
        req.query.month &&
        `${req.query.year}-${String(req.query.month).padStart(2, "0")}`);

    if (!/^\d{4}-\d{2}$/.test(monthYear || "")) {
      throw new Error("Provide ?monthYear=YYYY-MM or ?year=YYYY&month=MM");
    }

    // mode: "top" | "bottom" | "total" | "region" | "bottomhistory"
    const mode = (req.query.mode || "top").toLowerCase();

    let body;
    const cnn = await getPool();
    if (mode === "bottomhistory") {
      // New mode for bottom 5 with previous months' sales
      // Calculate previous months
      const [y, m] = monthYear.split("-").map(Number);
      let prevMonth = new Date(y, m - 2, 1);
      let prev2Month = new Date(y, m - 3, 1);
      const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
      const prev2MonthStr = `${prev2Month.getFullYear()}-${String(prev2Month.getMonth() + 1).padStart(2, "0")}`;
      const result = await cnn
        .request()
        .input("CurrentMonth", sql.Char(7), monthYear)
        .input("PrevMonth", sql.Char(7), prevMonthStr)
        .input("Prev2Month", sql.Char(7), prev2MonthStr)
        .execute("dbo.GetBottomSalesRepsWithHistory");
      body = (result.recordset || []).map(r => ({
        SalesRepID: Number(r.SalesRepID),
        FullName: r.FullName ?? null,
        CurrentSales: r.CurrentSales != null ? Number(r.CurrentSales) : 0,
        PrevSales: r.PrevSales != null ? Number(r.PrevSales) : 0,
        Prev2Sales: r.Prev2Sales != null ? Number(r.Prev2Sales) : 0,
      }));
    } else {
      // Map mode -> stored procedure name
      let procName;
      switch (mode) {
        case "bottom":
          procName = "dbo.GetBottomSalesRepsByMonth";
          break;
        case "total":
          procName = "dbo.GetTotalSalesByMonth";
          break;
        case "region":
          procName = "dbo.GetSalesByRegionByMonth";
          break;
        case "top":
        default:
          procName = "dbo.GetTopSalesRepsByMonth";
          break;
      }
      const result = await cnn
        .request()
        .input("MonthYear", sql.Char(7), monthYear)
        .execute(procName);
      const raw = result.recordset || [];
      if (mode === "top" || mode === "bottom") {
        body = raw.map((r) => ({
          SalesRepID: Number(r.SalesRepID),
          FullName: r.FullName ?? null,
          TotalRevenue: r.TotalRevenue != null ? Number(r.TotalRevenue) : 0,
          CustomerCount: r.CustomerCount != null ? Number(r.CustomerCount) : 0,
        }));
      } else {
        if (mode === "total") {
          body = raw.map((r) => ({
            TotalSales: r.TotalSales != null ? Number(r.TotalSales) : 0,
          }));
        } else if (mode === "region") {
          body = raw.map((r) => ({
            RegionKey: r.RegionKey,
            RegionName: r.RegionName,
            TotalSales: r.TotalSales != null ? Number(r.TotalSales) : 0,
          }));
        } else {
          body = raw;
        }
      }
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body,
    };
  } catch (e) {
    context.log.error(e);
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: e.message || "Request failed" },
    };
  } finally {
    addCors(context.res);
  }
};

