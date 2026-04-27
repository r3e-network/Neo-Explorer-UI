const { json, readJsonBody, readSessionFromRequest } = require("../lib/chatAuth");
const { enforceSimpleRateLimit } = require("../lib/simpleRateLimit");
const { markMessagesRead } = require("../lib/chatSupabase");
const { withApiTelemetry } = require("../lib/telemetry");

async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const session = readSessionFromRequest(req);
    if (!enforceSimpleRateLimit({
      req,
      res,
      prefix: "chat-read",
      key: session?.address || "unknown",
      windowMs: 60_000,
      maxRequests: Number(process.env.CHAT_READ_RATE_LIMIT_PER_MINUTE || 120),
    })) {
      return;
    }
    const body = await readJsonBody(req, { maxBytes: 2048 });
    const roomId = String(body.roomId || "").trim();
    if (!roomId) {
      throw new Error("roomId is required.");
    }
    const rows = await markMessagesRead(roomId, session.address);
    return json(res, 200, { updated: rows.length });
  } catch (error) {
    return json(res, 400, { error: error.message || "Unable to mark chat messages as read." });
  }
}

module.exports = withApiTelemetry("chat/read", handler);
