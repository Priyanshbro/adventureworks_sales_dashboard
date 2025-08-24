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
    // ---- Auth (JWT) ----
    const auth = req.headers["authorization"] || "";
    if (!auth.startsWith("Bearer ")) throw new Error("Missing token");
    jwt.verify(auth.slice(7), "myhardcodedsecret123");

    // ---- Inputs ----
    const monthYear =
      req.query.monthYear ||
      (req.query.year &&
        req.query.month &&
        `${req.query.year}-${String(req.query.month).padStart(2, "0")}`);

    if (!/^\d{4}-\d{2}$/.test(monthYear || "")) {
      throw new Error("Provide ?monthYear=YYYY-MM or ?year=YYYY&month=MM");
    }

    // mode: "top" | "bottom" | "total" | "region"
    const mode = (req.query.mode || "top").toLowerCase();

    // Map mode -> stored procedure name
    let procName;
    switch (mode) {
      case "bottom":
        // always includes zero-sales reps (your proc is written that way)
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

    // ---- Execute stored procedure ----
    const cnn = await getPool();
    const result = await cnn
      .request()
      .input("MonthYear", sql.Char(7), monthYear)
      .execute(procName);

    const raw = result.recordset || [];

    // ---- Normalize output shape for top/bottom; pass-through for others ----
    let body;
    if (mode === "top" || mode === "bottom") {
      // Expecting: SalesRepID, FullName, TotalRevenue, CustomerCount
      body = raw.map((r) => ({
        SalesRepID: Number(r.SalesRepID),
        FullName: r.FullName ?? null,
        TotalRevenue: r.TotalRevenue != null ? Number(r.TotalRevenue) : 0,
        CustomerCount: r.CustomerCount != null ? Number(r.CustomerCount) : 0,
      }));
    } else {
      // For "total": [{ TotalSales: number }]
      // For "region": [{ RegionKey, RegionName, TotalSales }]
      // Return as-is but coerce numeric fields
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

