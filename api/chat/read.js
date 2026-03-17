const { json, readJsonBody, readSessionFromRequest } = require("../lib/chatAuth");
const { markMessagesRead } = require("../lib/chatSupabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const session = readSessionFromRequest(req);
    const body = await readJsonBody(req);
    const roomId = String(body.roomId || "").trim();
    if (!roomId) {
      throw new Error("roomId is required.");
    }
    const rows = await markMessagesRead(roomId, session.address);
    return json(res, 200, { updated: rows.length });
  } catch (error) {
    return json(res, 400, { error: error.message || "Unable to mark chat messages as read." });
  }
};
