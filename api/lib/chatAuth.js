const crypto = require("crypto");
const bs58Module = require("bs58");
const bs58 = bs58Module.decode ? bs58Module : bs58Module.default;
let neoSdkPromise = null;

function loadNeoSdk() {
  if (!neoSdkPromise) {
    neoSdkPromise = import("@r3e/neo-js-sdk");
  }
  return neoSdkPromise;
}

const SESSION_COOKIE_NAME = "neo_chat_session";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeAddress(address) {
  const value = String(address || "").trim();
  if (!isNeoAddress(value)) {
    throw new Error("Invalid Neo address.");
  }
  return value;
}

function normalizePublicKey(publicKey) {
  const value = String(publicKey || "").trim();
  if (!/^(02|03)[0-9a-fA-F]{64}$|^04[0-9a-fA-F]{128}$/.test(value)) {
    throw new Error("Invalid public key.");
  }
  return value;
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest();
}

function isNeoAddress(address) {
  try {
    const decoded = bs58.decode(String(address || "").trim());
    if (decoded.length !== 25) return false;
    if (decoded[0] !== 53) return false;
    const payload = decoded.subarray(0, 21);
    const checksum = decoded.subarray(21);
    const expected = sha256(sha256(payload)).subarray(0, 4);
    return Buffer.from(checksum).equals(Buffer.from(expected));
  } catch {
    return false;
  }
}

function canonicalizeParticipantPair(addressA, addressB) {
  const left = normalizeAddress(addressA);
  const right = normalizeAddress(addressB);
  if (left === right) {
    throw new Error("Peer-to-peer chat requires two distinct addresses.");
  }
  return [left, right].sort((a, b) => a.localeCompare(b));
}

function createChallengeMessage({ address, nonce, challengeId, issuedAt }) {
  return [
    "Neo Explorer Chat Login",
    `Address: ${normalizeAddress(address)}`,
    `Challenge ID: ${challengeId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    "This signature authorizes a NeoChat session.",
  ].join("\n");
}

function getSessionSecret() {
  const secret = String(process.env.CHAT_SESSION_SECRET || "").trim();
  if (!secret) {
    throw new Error("CHAT_SESSION_SECRET is required.");
  }
  return secret;
}

function signPayload(payload, secret = getSessionSecret()) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySignedPayload(token, secret = getSessionSecret()) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) {
    throw new Error("Invalid signed payload.");
  }

  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  const isValid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!isValid) {
    throw new Error("Signed payload verification failed.");
  }

  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
}

function buildSession(address, publicKey) {
  const now = Date.now();
  return {
    address: normalizeAddress(address),
    publicKey: normalizePublicKey(publicKey),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };
}

function serializeSessionCookie(session) {
  const token = signPayload(session);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function parseCookies(req) {
  const cookieHeader = req?.headers?.cookie || req?.headers?.Cookie || "";
  return String(cookieHeader)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const idx = part.indexOf("=");
      if (idx <= 0) return acc;
      acc[part.slice(0, idx)] = decodeURIComponent(part.slice(idx + 1));
      return acc;
    }, {});
}

function readSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const payload = verifySignedPayload(token);
  if (Date.parse(payload.expiresAt || "") <= Date.now()) {
    throw new Error("Chat session expired.");
  }
  return payload;
}

async function deriveAddressFromPublicKey(publicKey) {
  const normalizedPublicKey = normalizePublicKey(publicKey);
  const { PublicKey } = await loadNeoSdk();
  return new PublicKey(normalizedPublicKey).getAddress();
}

async function verifyChallengeSignature({ message, signature, publicKey, address }) {
  const normalizedAddress = normalizeAddress(address);
  const normalizedPublicKey = normalizePublicKey(publicKey);
  const normalizedSignature = String(signature || "").trim();
  if (!normalizedSignature) {
    throw new Error("Missing signature.");
  }

  const { PublicKey, hexToBytes, str2hexstring } = await loadNeoSdk();
  const matches = new PublicKey(normalizedPublicKey).verify(
    hexToBytes(str2hexstring(message)),
    hexToBytes(normalizedSignature),
  );
  if (!matches) {
    throw new Error("Invalid chat login signature.");
  }

  const derivedAddress = await deriveAddressFromPublicKey(normalizedPublicKey);
  if (derivedAddress !== normalizedAddress) {
    throw new Error("Signature public key does not match the requested address.");
  }

  return true;
}

function json(res, status, payload, extraHeaders = {}) {
  Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
}

async function readJsonBody(req) {
  if (req?.body && typeof req.body === "object") return req.body;
  if (typeof req?.body === "string" && req.body) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

module.exports = {
  SESSION_COOKIE_NAME,
  CHALLENGE_TTL_MS,
  SESSION_TTL_MS,
  normalizeAddress,
  normalizePublicKey,
  canonicalizeParticipantPair,
  createChallengeMessage,
  signPayload,
  verifySignedPayload,
  buildSession,
  serializeSessionCookie,
  clearSessionCookie,
  parseCookies,
  readSessionFromRequest,
  deriveAddressFromPublicKey,
  verifyChallengeSignature,
  json,
  readJsonBody,
};
