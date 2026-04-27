const { json, normalizeAddress, readJsonBody, readSessionFromRequest } = require("../lib/chatAuth");
const { enforceSimpleRateLimit } = require("../lib/simpleRateLimit");
const { withApiTelemetry } = require("../lib/telemetry");
const {
  findRoomByParticipants,
  getRoomById,
  insertMessage,
  listMessagesForRoom,
  shapeRoomForAddress,
  upsertRoom,
  updateRoomActivity,
} = require("../lib/chatSupabase");

function sanitizeMessageBody(value) {
  const body = String(value || "").trim();
  if (!body) throw new Error("Message body is required.");
  if (body.length > 2000) throw new Error("Message body exceeds 2000 characters.");
  return body;
}

async function handler(req, res) {
  try {
    const session = readSessionFromRequest(req);

    if (req.method === "GET") {
      const roomId = String(req.query.roomId || "").trim();
      if (!roomId) {
        throw new Error("roomId is required.");
      }
      const room = await getRoomById(roomId);
      if (!room) {
        throw new Error("Chat room not found.");
      }
      if (room.participant_low_address !== session.address && room.participant_high_address !== session.address) {
        throw new Error("Unauthorized chat room access.");
      }
      const requestedLimit = Number(req.query.limit || 50);
      const messages = await listMessagesForRoom(roomId, {
        before: req.query.before ? String(req.query.before) : "",
        limit: Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50,
      });
      return json(res, 200, { messages });
    }

    if (req.method !== "POST") {
      return json(res, 405, { error: "Method not allowed." });
    }

    if (!enforceSimpleRateLimit({
      req,
      res,
      prefix: "chat-message",
      key: session?.address || "unknown",
      windowMs: 60_000,
      maxRequests: Number(process.env.CHAT_MESSAGE_RATE_LIMIT_PER_MINUTE || 30),
    })) {
      return;
    }
    const body = await readJsonBody(req, { maxBytes: 4096 });
    const recipientAddress = normalizeAddress(body.recipientAddress);
    const recipientLabel = String(body.recipientLabel || "").trim();
    const messageBody = sanitizeMessageBody(body.body);

    const existing = await findRoomByParticipants(session.address, recipientAddress);
    const room = existing || (await upsertRoom({
      addressA: session.address,
      addressB: recipientAddress,
      labelA: "",
      labelB: recipientLabel,
    }));

    const message = await insertMessage({
      roomId: room.id,
      senderAddress: session.address,
      recipientAddress,
      body: messageBody,
    });

    await updateRoomActivity(room.id, {
      last_message_at: message.created_at,
      last_message_preview: message.body.slice(0, 140),
      last_sender_address: session.address,
    });

    return json(res, 200, {
      room: shapeRoomForAddress(room, session.address),
      message,
    });
  } catch (error) {
    return json(res, 400, { error: error.message || "Unable to handle chat messages." });
  }
}

module.exports = withApiTelemetry("chat/messages", handler);
