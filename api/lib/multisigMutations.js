const { enforceSimpleRateLimit } = require("./simpleRateLimit");

const DEFAULT_MAX_BODY_BYTES = 16 * 1024;

function multisigMutationsEnabled() {
  return String(process.env.ENABLE_FRONTEND_MULTISIG_MUTATIONS || "").trim().toLowerCase() === "true";
}

function requestBodySize(req) {
  try {
    return Buffer.byteLength(JSON.stringify(req.body || {}), "utf8");
  } catch {
    return DEFAULT_MAX_BODY_BYTES + 1;
  }
}

function enforceMultisigMutationPolicy(req, res, { operation = "default", key = "default", maxBodyBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  if (!multisigMutationsEnabled()) {
    res.status(503).json({ error: "Multisig mutations are disabled on this frontend API." });
    return false;
  }

  if (requestBodySize(req) > maxBodyBytes) {
    res.status(413).json({ error: "Multisig mutation request body is too large." });
    return false;
  }

  return enforceSimpleRateLimit({
    req,
    res,
    prefix: `multisig:${operation}`,
    key,
    windowMs: 60 * 1000,
    maxRequests: Number(process.env.MULTISIG_MUTATION_RATE_LIMIT_PER_MINUTE || 20),
  });
}

module.exports = {
  enforceMultisigMutationPolicy,
  multisigMutationsEnabled,
};
