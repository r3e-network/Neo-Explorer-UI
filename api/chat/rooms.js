const { json, readSessionFromRequest } = require("../lib/chatAuth");
const { getUnreadNotificationData, listRoomsForAddress, shapeRoomForAddress } = require("../lib/chatSupabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const session = readSessionFromRequest(req);
    const rooms = await listRoomsForAddress(session.address);
    const unread = await getUnreadNotificationData(session.address);
    const unreadMap = new Map((unread.notifications || []).map((item) => [item.roomId, item.unreadCount || 0]));
    const payload = rooms.map((room) => ({
      ...shapeRoomForAddress(room, session.address),
      unreadCount: unreadMap.get(room.id) || 0,
    }));
    return json(res, 200, { rooms: payload });
  } catch (error) {
    return json(res, 401, { error: error.message || "Unauthorized." });
  }
};
