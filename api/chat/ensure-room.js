const { json, normalizeAddress, readJsonBody, readSessionFromRequest } = require("../lib/chatAuth");
const { findRoomByParticipants, shapeRoomForAddress, upsertRoom } = require("../lib/chatSupabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const session = readSessionFromRequest(req);
    const body = await readJsonBody(req);
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
};
