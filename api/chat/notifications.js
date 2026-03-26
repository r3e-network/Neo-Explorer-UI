const { json, readSessionFromRequest } = require("../lib/chatAuth");
const { getUnreadNotificationData } = require("../lib/chatSupabase");
const { withApiTelemetry } = require("../lib/telemetry");

async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const session = readSessionFromRequest(req);
    const payload = await getUnreadNotificationData(session.address);
    return json(res, 200, payload);
  } catch (error) {
    return json(res, 401, { error: error.message || "Unauthorized." });
  }
}

module.exports = withApiTelemetry("chat/notifications", handler);
