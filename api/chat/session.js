const { clearSessionCookie, json, readSessionFromRequest } = require("../lib/chatAuth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const session = readSessionFromRequest(req);
    return json(res, 200, { session });
  } catch (_error) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return json(res, 200, { session: null });
  }
};
