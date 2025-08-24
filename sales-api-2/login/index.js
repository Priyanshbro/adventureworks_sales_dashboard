const jwt = require("jsonwebtoken");

function addCors(res) {
  res.headers = res.headers || {};
  res.headers["Access-Control-Allow-Origin"] = process.env.ALLOWED_ORIGIN || "*";
  res.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
  res.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS";
}

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    context.res = { status: 200 };
    addCors(context.res);
    return;
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { error: "Username and password are required" },
      };
      return;
    }

    // Allow env-based creds, but default to admin/password123 for your case study
    const VALID_USER = "admin";
    const VALID_PASS = "password123";

    if (username !== VALID_USER || password !== VALID_PASS) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { error: "Invalid credentials" },
      };
      return;
    }

    const secret = "myhardcodedsecret123";

    const token = jwt.sign({ sub: username }, secret, { expiresIn: "2h" });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { token },
    };
  } catch (err) {
    context.log.error(err);
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: err.message || "Bad Request" },
    };
  } finally {
    addCors(context.res);
  }
};