function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toId(value) {
  return value === null || value === undefined ? "" : String(value);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function looksLikeNeoAddress(value) {
  return /^N[1-9A-HJ-NP-Za-km-z]{33}$/.test(normalizeText(value));
}

function buildUrl(url, query = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function buildTargetPayload(targetInput) {
  if (!targetInput) return {};

  if (typeof targetInput === "string") {
    const value = normalizeText(targetInput);
    return {
      with: value,
      target: value,
      rawTarget: value,
      resolvedTarget: value,
      address: looksLikeNeoAddress(value) ? value : "",
      domain: looksLikeNeoAddress(value) ? "" : value,
    };
  }

  const withValue = pickFirstString(
    targetInput.with,
    targetInput.target,
    targetInput.rawTarget,
    targetInput.resolvedTarget,
    targetInput.address,
    targetInput.domain
  );
  const address = pickFirstString(targetInput.address, looksLikeNeoAddress(withValue) ? withValue : "");
  const domain = pickFirstString(targetInput.domain, address ? "" : withValue.includes(".") ? withValue : "");

  return {
    with: withValue,
    target: pickFirstString(targetInput.target, withValue),
    rawTarget: pickFirstString(targetInput.rawTarget, domain, withValue),
    resolvedTarget: pickFirstString(targetInput.resolvedTarget, address, domain, withValue),
    address,
    domain,
  };
}

function extractList(payload, keys) {
  if (Array.isArray(payload)) return payload;
  if (!isObject(payload)) return [];

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
}

function extractValue(payload, keys) {
  if (!isObject(payload)) return payload;

  for (const key of keys) {
    if (payload[key] !== undefined) {
      return payload[key];
    }
  }

  return payload;
}

function normalizeChatSessionPayload(payload) {
  const session = isObject(payload?.session) ? payload.session : isObject(payload) ? payload : {};
  const user = isObject(session.user) ? session.user : {};
  const address = pickFirstString(session.address, session.walletAddress, session.userAddress, user.address);

  return {
    ...session,
    user: isObject(session.user) ? { ...user, address: pickFirstString(user.address, address) } : null,
    address,
    authenticated: Boolean(session.authenticated ?? address),
  };
}

function normalizeChatMessage(message, currentAddress = "") {
  if (!isObject(message)) return null;

  const senderAddress = pickFirstString(message.senderAddress, message.sender_address, message.sender?.address);
  const recipientAddress = pickFirstString(message.recipientAddress, message.recipient_address, message.recipient?.address);
  const content = pickFirstString(message.content, message.body, message.text);
  const createdAt = pickFirstString(message.createdAt, message.created_at, message.sentAt, message.sent_at);
  const readAt = pickFirstString(message.readAt, message.read_at);

  return {
    ...message,
    id: toId(message.id ?? message.messageId ?? message.message_id),
    roomId: toId(message.roomId ?? message.room_id),
    content,
    senderAddress,
    recipientAddress,
    createdAt,
    readAt,
    isOwn: Boolean(currentAddress && senderAddress && senderAddress === currentAddress),
  };
}

function collectParticipantAddresses(room) {
  const participants = [];

  const pushAddress = (value) => {
    const address = normalizeText(value);
    if (address && !participants.includes(address)) {
      participants.push(address);
    }
  };

  for (const value of room.participantAddresses || room.participant_addresses || []) {
    pushAddress(value);
  }

  for (const participant of room.participants || []) {
    pushAddress(participant?.address || participant?.walletAddress);
  }

  pushAddress(room.participantLowAddress || room.participant_low_address);
  pushAddress(room.participantHighAddress || room.participant_high_address);
  pushAddress(room.peerAddress || room.peer_address);
  pushAddress(room.otherAddress || room.other_address);

  return participants;
}

function normalizeChatRoom(room, currentAddress = "") {
  if (!isObject(room)) return null;

  const participants = collectParticipantAddresses(room);
  const peer = isObject(room.peer)
    ? room.peer
    : isObject(room.counterparty)
      ? room.counterparty
      : isObject(room.otherParticipant)
        ? room.otherParticipant
        : {};
  const lastMessage = normalizeChatMessage(
    room.lastMessage || room.last_message || room.latestMessage || room.latest_message,
    currentAddress
  );

  let peerAddress = pickFirstString(
    room.peerAddress,
    room.peer_address,
    room.otherAddress,
    room.other_address,
    room.otherParticipantAddress,
    room.other_participant_address,
    peer.address,
    peer.walletAddress
  );

  if (!peerAddress && currentAddress && participants.length > 0) {
    peerAddress = participants.find((address) => address !== currentAddress) || "";
  }

  if (!peerAddress && participants.length === 1) {
    peerAddress = participants[0];
  }

  const peerDomain = pickFirstString(
    room.peerDomain,
    room.peer_domain,
    room.otherDomain,
    room.other_domain,
    room.targetDomain,
    room.target_domain,
    peer.domain
  );

  const peerLabel = pickFirstString(
    room.peerLabel,
    room.peer_domain_label,
    room.otherParticipantLabel,
    room.other_participant_label,
    room.otherLabel,
    room.other_label,
    peer.label,
    room.displayName,
    room.title,
    peerDomain,
    peerAddress
  );

  const id = toId(room.id ?? room.roomId ?? room.room_id);

  return {
    ...room,
    id,
    roomId: id,
    participantAddresses: participants,
    peerAddress,
    peerDomain,
    peerLabel,
    otherParticipantAddress: peerAddress,
    otherParticipantLabel: pickFirstString(room.otherParticipantLabel, room.other_participant_label, peerLabel, peerDomain, peerAddress),
    unreadCount: toNumber(room.unreadCount ?? room.unread_count ?? room.unread, 0),
    preview: pickFirstString(room.preview, room.lastPreview, room.last_preview, lastMessage?.content),
    lastMessage,
    updatedAt: pickFirstString(
      room.updatedAt,
      room.updated_at,
      room.lastMessageAt,
      room.last_message_at,
      lastMessage?.createdAt
    ),
  };
}

function normalizeChatNotification(notification, currentAddress = "") {
  if (!isObject(notification)) return null;

  const room = normalizeChatRoom(notification.room || notification.chatRoom || notification, currentAddress);
  const message = normalizeChatMessage(
    notification.message || notification.latestMessage || notification.lastMessage,
    currentAddress
  );
  const roomId = toId(notification.roomId ?? notification.room_id ?? room?.roomId);
  const otherParticipantAddress = pickFirstString(
    notification.otherParticipantAddress,
    notification.other_participant_address,
    room?.otherParticipantAddress,
    message?.isOwn ? message?.recipientAddress : message?.senderAddress
  );

  return {
    ...notification,
    id: toId(notification.id ?? notification.notificationId ?? notification.notification_id ?? roomId),
    roomId,
    otherParticipantAddress,
    otherParticipantLabel: pickFirstString(
      notification.otherParticipantLabel,
      notification.other_participant_label,
      room?.otherParticipantLabel,
      room?.peerDomain,
      otherParticipantAddress
    ),
    preview: pickFirstString(notification.preview, room?.preview, message?.content),
    unreadCount: toNumber(notification.unreadCount ?? notification.unread_count ?? room?.unreadCount, 0),
    room,
    message,
  };
}

async function parseJson(response) {
  const contentType = response?.headers?.get?.("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function request(url, options = {}) {
  const response = await fetch(buildUrl(url, options.query), {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    const error = new Error(
      normalizeText(payload?.error) ||
        normalizeText(payload?.message) ||
        `Chat API request failed with status ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const chatService = {
  async getSession({ signal } = {}) {
    const payload = await request("/api/chat/session", { method: "GET", signal });
    return normalizeChatSessionPayload(payload);
  },

  async requestChallenge(address) {
    return await request("/api/chat/auth/challenge", {
      method: "POST",
      body: JSON.stringify({ address: normalizeText(address) }),
    });
  },

  async verifyChallenge(input) {
    const payload = await request("/api/chat/auth/verify", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return normalizeChatSessionPayload(payload?.session || payload);
  },

  async getRooms({ currentAddress = "", signal } = {}) {
    const payload = await request("/api/chat/rooms", { method: "GET", signal });
    return extractList(payload, ["rooms", "result", "data"])
      .map((room) => normalizeChatRoom(room, currentAddress))
      .filter(Boolean);
  },

  async ensureRoom(target, { currentAddress = "", signal } = {}) {
    const targetPayload = buildTargetPayload(target);
    const payload = await request("/api/chat/ensure-room", {
      method: "POST",
      body: JSON.stringify({
        peerAddress: pickFirstString(target?.peerAddress, target?.address, targetPayload.address, targetPayload.resolvedTarget),
        peerLabel: pickFirstString(target?.peerLabel, target?.label, targetPayload.rawTarget, targetPayload.domain),
      }),
      signal,
    });

    return normalizeChatRoom(extractValue(payload, ["room", "result", "data"]), currentAddress);
  },

  async getMessages(roomId, options = {}) {
    const payload = await request("/api/chat/messages", {
      method: "GET",
      query: {
        roomId: toId(roomId),
        before: options.before,
        limit: options.limit,
      },
      signal: options.signal,
    });

    return extractList(payload, ["messages", "result", "data"])
      .map((message) => normalizeChatMessage(message, options.currentAddress || ""))
      .filter(Boolean);
  },

  async sendMessage(input, options = {}) {
    const payload = await request("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify({
        roomId: toId(input?.roomId),
        recipientAddress: pickFirstString(input?.recipientAddress, input?.otherParticipantAddress),
        recipientLabel: pickFirstString(input?.recipientLabel, input?.otherParticipantLabel),
        body: normalizeText(input?.body || input?.content),
      }),
      signal: options.signal,
    });

    return normalizeChatMessage(extractValue(payload, ["message", "result", "data"]), options.currentAddress || "");
  },

  async markRoomRead(roomId, { signal } = {}) {
    return await request("/api/chat/read", {
      method: "POST",
      body: JSON.stringify({ roomId: toId(roomId) }),
      signal,
    });
  },

  async getNotifications({ currentAddress = "", signal } = {}) {
    const payload = await request("/api/chat/notifications", { method: "GET", signal });
    return {
      unreadCount: toNumber(payload?.unreadCount ?? payload?.unread_count, 0),
      notifications: extractList(payload, ["notifications", "items", "result", "data"])
        .map((notification) => normalizeChatNotification(notification, currentAddress))
        .filter(Boolean),
    };
  },
};

export default chatService;
