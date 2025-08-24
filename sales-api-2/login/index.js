const jwt = require("jsonwebtoken");

function addCors(res){
  res.headers = res.headers || {};
  res.headers["Access-Control-Allow-Origin"] = process.env.ALLOWED_ORIGIN || "*";
  res.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
  res.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS";
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 200 };
    addCors(context.res);
    return;
  }
  try {
    const { username, password } = req.body || {};
    if (username === process.env.APP_USER && password === process.env.APP_PASS) {
      const token = jwt.sign({ sub: username }, process.env.JWT_SECRET, { expiresIn: "2h" });
      context.res = { status: 200, headers: { "Content-Type": "application/json" }, body: { token } };
    } else {
      context.res = { status: 401, headers: { "Content-Type": "application/json" }, body: { error: "Invalid credentials" } };
    }
  } catch (err) {
    context.log.error(err);
    context.res = { status: 400, headers: { "Content-Type": "application/json" }, body: { error: err.message || "Bad Request" } };
  } finally {
    addCors(context.res);
  }
};