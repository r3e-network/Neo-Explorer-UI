const { json, normalizeAddress, readJsonBody, readSessionFromRequest } = require("../lib/chatAuth");
const { enforceSimpleRateLimit } = require("../lib/simpleRateLimit");
const { findRoomByParticipants, shapeRoomForAddress, upsertRoom } = require("../lib/chatSupabase");
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
      prefix: "chat-room",
      key: session?.address || "unknown",
      windowMs: 60_000,
      maxRequests: Number(process.env.CHAT_ROOM_RATE_LIMIT_PER_MINUTE || 20),
    })) {
      return;
    }
    const body = await readJsonBody(req, { maxBytes: 2048 });
    const peerAddress = normalizeAddress(body.peerAddress);
    const peerLabel = String(body.peerLabel || "").trim();

    const existing = await findRoomByParticipants(session.address, peerAddress);
    const room = existing || (await upsertRoom({
      addressA: session.address,
      addressB: peerAddress,
      labelA: "",
      labelB: peerLabel,
    }));

    return json(res, 200, {
      room: {
        ...shapeRoomForAddress(room, session.address),
      },
    });
  } catch (error) {
    return json(res, 400, { error: error.message || "Unable to create or load room." });
  }
}

module.exports = withApiTelemetry("chat/ensure-room", handler);
