const crypto = require("crypto");
const { CHALLENGE_TTL_MS, createChallengeMessage, json, normalizeAddress, readJsonBody } = require("../../lib/chatAuth");
const { createChallenge, updateChallengeMessage } = require("../../lib/chatSupabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = await readJsonBody(req);
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
};
