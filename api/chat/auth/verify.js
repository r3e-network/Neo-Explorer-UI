const {
  buildSession,
  clearSessionCookie,
  createChallengeMessage,
  json,
  normalizeAddress,
  readJsonBody,
  serializeSessionCookie,
  verifyChallengeSignature,
} = require("../../lib/chatAuth");
const { enforceSimpleRateLimit } = require("../../lib/simpleRateLimit");
const { consumeChallenge, getChallengeById } = require("../../lib/chatSupabase");
const { withApiTelemetry } = require("../../lib/telemetry");

async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    if (!enforceSimpleRateLimit({
      req,
      res,
      prefix: "chat-verify",
      key: "verify",
      windowMs: 60_000,
      maxRequests: Number(process.env.CHAT_VERIFY_RATE_LIMIT_PER_MINUTE || 20),
    })) {
      return;
    }
    const body = await readJsonBody(req, { maxBytes: 4096 });
    const challengeId = String(body.challengeId || "").trim();
    const address = normalizeAddress(body.address);
    const publicKey = String(body.publicKey || "").trim();
    const signature = String(body.signature || "").trim();
    if (!challengeId || !publicKey || !signature) {
      throw new Error("Missing chat auth verification fields.");
    }

    const challenge = await getChallengeById(challengeId);
    if (!challenge || challenge.address !== address) {
      throw new Error("Chat challenge not found.");
    }
    if (challenge.consumed_at) {
      throw new Error("Chat challenge already used.");
    }
    if (Date.parse(challenge.expires_at) <= Date.now()) {
      throw new Error("Chat challenge expired.");
    }

    const message =
      challenge.message ||
      createChallengeMessage({
        address,
        nonce: challenge.nonce,
        challengeId: challenge.id,
        issuedAt: challenge.created_at,
      });

    await verifyChallengeSignature({
      message,
      signature,
      publicKey,
      address,
    });

    await consumeChallenge(challenge.id);
    const session = buildSession(address, publicKey);
    res.setHeader("Set-Cookie", serializeSessionCookie(session));
    return json(res, 200, { session });
  } catch (error) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return json(res, 400, { error: error.message || "Chat auth verification failed." });
  }
}

module.exports = withApiTelemetry("chat/auth/verify", handler);
