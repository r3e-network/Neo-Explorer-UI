const crypto = require("crypto");
const { CHALLENGE_TTL_MS, createChallengeMessage, json, normalizeAddress, readJsonBody } = require("../../lib/chatAuth");
const { enforceSimpleRateLimit } = require("../../lib/simpleRateLimit");
const { createChallenge, updateChallengeMessage } = require("../../lib/chatSupabase");
const { withApiTelemetry } = require("../../lib/telemetry");

async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    if (!enforceSimpleRateLimit({
      req,
      res,
      prefix: "chat-challenge",
      key: "create",
      windowMs: 60_000,
      maxRequests: Number(process.env.CHAT_CHALLENGE_RATE_LIMIT_PER_MINUTE || 10),
    })) {
      return;
    }
    const body = await readJsonBody(req, { maxBytes: 2048 });
    const address = normalizeAddress(body.address);
    const nonce = crypto.randomBytes(16).toString("hex");
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    const row = await createChallenge({
      address,
      nonce,
      message: "",
      expiresAt,
    });
    const message = createChallengeMessage({
      address,
      nonce,
      challengeId: row.id,
      issuedAt,
    });

    await updateChallengeMessage(row.id, message);

    return json(res, 200, {
      challengeId: row.id,
      address,
      message,
      expiresAt,
    });
  } catch (error) {
    return json(res, 400, { error: error.message || "Unable to create chat challenge." });
  }
}

module.exports = withApiTelemetry("chat/auth/challenge", handler);
