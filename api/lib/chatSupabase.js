const { Pool } = require("pg");
const { canonicalizeParticipantPair, normalizeAddress } = require("./chatAuth");
const { buildPgSslConfig, buildPgPoolTimeouts } = require("./pgSsl");

let pool = null;

function getDatabaseUrl() {
  return (
    process.env.CHAT_DATABASE_URL ||
    process.env.SUPABASE_DSN ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
}

function normalizeConnectionString(connectionString) {
  return connectionString
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "");
}

function getPool() {
  if (pool) return pool;

  const rawConnectionString = getDatabaseUrl();
  const connectionString = normalizeConnectionString(rawConnectionString);
  if (!connectionString) {
    throw new Error("CHAT_DATABASE_URL or SUPABASE_DSN is required for NeoChat.");
  }

  pool = new Pool({
    connectionString,
    max: Number(process.env.CHAT_DB_MAX_CONNS || 4),
    ssl: buildPgSslConfig({ rawConnectionString }),
    ...buildPgPoolTimeouts(),
  });

  return pool;
}

async function query(sql, params = []) {
  return await getPool().query(sql, params);
}

async function createChallenge({ address, nonce, message, expiresAt }) {
  const { rows } = await query(
    `
      insert into chat_challenges(address, nonce, message, expires_at)
      values ($1, $2, $3, $4)
      returning *
    `,
    [normalizeAddress(address), nonce, message, expiresAt]
  );
  return rows[0] || null;
}

async function updateChallengeMessage(id, message) {
  const { rows } = await query(
    `
      update chat_challenges
      set message = $2
      where id = $1
      returning *
    `,
    [id, message]
  );
  return rows[0] || null;
}

async function getChallengeById(id) {
  const { rows } = await query(
    `
      select *
      from chat_challenges
      where id = $1
      limit 1
    `,
    [id]
  );
  return rows[0] || null;
}

async function consumeChallenge(id) {
  await query(
    `
      update chat_challenges
      set consumed_at = now()
      where id = $1
    `,
    [id]
  );
}

function shapeRoomForAddress(room, viewerAddress) {
  const normalizedViewer = normalizeAddress(viewerAddress);
  const isLow = room.participant_low_address === normalizedViewer;
  return {
    id: room.id,
    roomId: room.id,
    otherParticipantAddress: isLow ? room.participant_high_address : room.participant_low_address,
    otherParticipantLabel: isLow ? room.participant_high_label : room.participant_low_label,
    lastMessagePreview: room.last_message_preview || "",
    lastMessageAt: room.last_message_at,
    lastSenderAddress: room.last_sender_address,
    unreadCount: 0,
  };
}

async function findRoomByParticipants(addressA, addressB) {
  const [low, high] = canonicalizeParticipantPair(addressA, addressB);
  const { rows } = await query(
    `
      select *
      from chat_rooms
      where participant_low_address = $1
        and participant_high_address = $2
      limit 1
    `,
    [low, high]
  );
  return rows[0] || null;
}

async function getRoomById(roomId) {
  const { rows } = await query(
    `
      select *
      from chat_rooms
      where id = $1
      limit 1
    `,
    [roomId]
  );
  return rows[0] || null;
}

async function upsertRoom({ addressA, addressB, labelA = "", labelB = "" }) {
  const normalizedA = normalizeAddress(addressA);
  const normalizedB = normalizeAddress(addressB);
  const [low, high] = canonicalizeParticipantPair(normalizedA, normalizedB);
  const lowLabel = low === normalizedA ? labelA || null : labelB || null;
  const highLabel = high === normalizedB ? labelB || null : labelA || null;

  const { rows } = await query(
    `
      insert into chat_rooms(
        participant_low_address,
        participant_high_address,
        participant_low_label,
        participant_high_label,
        updated_at
      )
      values ($1, $2, $3, $4, now())
      on conflict (participant_low_address, participant_high_address)
      do update
        set participant_low_label = coalesce(excluded.participant_low_label, chat_rooms.participant_low_label),
            participant_high_label = coalesce(excluded.participant_high_label, chat_rooms.participant_high_label),
            updated_at = now()
      returning *
    `,
    [low, high, lowLabel, highLabel]
  );
  return rows[0] || null;
}

async function updateRoomActivity(roomId, updates) {
  const { rows } = await query(
    `
      update chat_rooms
      set last_message_preview = coalesce($2, last_message_preview),
          last_sender_address = coalesce($3, last_sender_address),
          last_message_at = coalesce($4, last_message_at),
          updated_at = now()
      where id = $1
      returning *
    `,
    [roomId, updates.last_message_preview || null, updates.last_sender_address || null, updates.last_message_at || null]
  );
  return rows[0] || null;
}

async function listRoomsForAddress(address) {
  const normalizedAddress = normalizeAddress(address);
  const { rows } = await query(
    `
      select *
      from chat_rooms
      where participant_low_address = $1
         or participant_high_address = $1
      order by last_message_at desc nulls last, updated_at desc
    `,
    [normalizedAddress]
  );
  return rows || [];
}

async function listMessagesForRoom(roomId, options = {}) {
  const params = [roomId];
  let where = "where room_id = $1";
  if (options.before) {
    params.push(options.before);
    where += ` and created_at < $${params.length}`;
  }
  params.push(Math.min(Number(options.limit || 50), 200));

  const { rows } = await query(
    `
      select *
      from (
        select *
        from chat_messages
        ${where}
        order by created_at desc
        limit $${params.length}
      ) recent
      order by created_at asc
    `,
    params
  );
  return rows || [];
}

async function insertMessage({ roomId, senderAddress, recipientAddress, body }) {
  const { rows } = await query(
    `
      insert into chat_messages(room_id, sender_address, recipient_address, body)
      values ($1, $2, $3, $4)
      returning *
    `,
    [roomId, normalizeAddress(senderAddress), normalizeAddress(recipientAddress), String(body || "").trim()]
  );
  return rows[0] || null;
}

async function markMessagesRead(roomId, recipientAddress) {
  const { rows } = await query(
    `
      update chat_messages
      set read_at = now()
      where room_id = $1
        and recipient_address = $2
        and read_at is null
      returning id
    `,
    [roomId, normalizeAddress(recipientAddress)]
  );
  return rows || [];
}

async function getUnreadNotificationData(address) {
  const normalizedAddress = normalizeAddress(address);

  const unreadCountResult = await query(
    `
      select count(*)::int as unread_count
      from chat_messages
      where recipient_address = $1
        and read_at is null
    `,
    [normalizedAddress]
  );
  const unreadCount = Number(unreadCountResult.rows[0]?.unread_count || 0);

  const unreadMessagesResult = await query(
    `
      select *
      from chat_messages
      where recipient_address = $1
        and read_at is null
      order by created_at desc
      limit 100
    `,
    [normalizedAddress]
  );
  const unreadMessages = unreadMessagesResult.rows || [];
  if (!unreadMessages.length) {
    return { unreadCount, notifications: [] };
  }

  const roomIds = [...new Set(unreadMessages.map((row) => row.room_id))];
  const roomsResult = await query(
    `
      select *
      from chat_rooms
      where id = any($1::uuid[])
    `,
    [roomIds]
  );
  const roomsById = new Map((roomsResult.rows || []).map((room) => [room.id, room]));

  const grouped = new Map();
  unreadMessages.forEach((message) => {
    const bucket = grouped.get(message.room_id) || {
      roomId: message.room_id,
      preview: message.body,
      latestCreatedAt: message.created_at,
      unreadCount: 0,
    };
    bucket.unreadCount += 1;
    grouped.set(message.room_id, bucket);
  });

  const notifications = Array.from(grouped.values())
    .map((item) => {
      const room = roomsById.get(item.roomId);
      if (!room) return null;
      return {
        ...shapeRoomForAddress(room, normalizedAddress),
        preview: item.preview,
        unreadCount: item.unreadCount,
        latestCreatedAt: item.latestCreatedAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.latestCreatedAt || "").localeCompare(String(a.latestCreatedAt || "")));

  return {
    unreadCount,
    notifications,
  };
}

module.exports = {
  getPool,
  createChallenge,
  updateChallengeMessage,
  getChallengeById,
  consumeChallenge,
  findRoomByParticipants,
  getRoomById,
  upsertRoom,
  updateRoomActivity,
  listRoomsForAddress,
  listMessagesForRoom,
  insertMessage,
  markMessagesRead,
  getUnreadNotificationData,
  shapeRoomForAddress,
};
