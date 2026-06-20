const fs = require("node:fs");

// Resolve the TLS config for a Postgres pool.
//
// The prior hardcoded `ssl: { rejectUnauthorized: false }` accepted ANY
// certificate, so anyone able to MITM the Vercel -> Supabase egress path could
// intercept or modify all DB traffic (chat, governance, multisig). This helper
// makes certificate verification the configurable, preferred path while staying
// backward-compatible for deployments that have not yet provisioned a CA.
//
// Preference order:
//   1. A pinned CA (DB_SSL_CA = PEM string, or DB_SSL_CA_FILE = path) -> the
//      equivalent of sslmode=verify-full: verify against the pinned root.
//   2. DB_SSL_REJECT_UNAUTHORIZED=1 -> verify against the system trust store.
//   3. Otherwise fall back to rejectUnauthorized:false, but warn once so the
//      insecurity is visible in logs instead of silent.

let warned = false;

function readCa(env) {
  const inline = String(env.DB_SSL_CA || "").trim();
  if (inline) return inline;
  const file = String(env.DB_SSL_CA_FILE || "").trim();
  if (file) {
    try {
      return fs.readFileSync(file, "utf8");
    } catch (err) {
      console.warn(`[pgSsl] could not read DB_SSL_CA_FILE (${file}): ${err?.message || err}`);
    }
  }
  return "";
}

function wantsTls(rawConnectionString, env) {
  if (String(env.DB_SSL || "").trim() === "1") return true;
  const dsn = String(rawConnectionString || "");
  return (
    /sslmode=(require|verify-ca|verify-full)/i.test(dsn) ||
    /\.supabase\.(co|com|net|in|io)[:/]/i.test(dsn) ||
    /\.pooler\.supabase\./i.test(dsn)
  );
}

// Returns a value suitable for the pg Pool `ssl` option: either `false` (no
// TLS) or an SSL options object.
function buildPgSslConfig({ rawConnectionString = "", env = process.env } = {}) {
  if (!wantsTls(rawConnectionString, env)) return false;

  const ca = readCa(env);
  if (ca) {
    return { ca, rejectUnauthorized: true };
  }

  if (String(env.DB_SSL_REJECT_UNAUTHORIZED || "").trim() === "1") {
    return { rejectUnauthorized: true };
  }

  if (!warned) {
    warned = true;
    console.warn(
      "[pgSsl] TLS certificate verification is DISABLED (rejectUnauthorized:false). " +
        "Set DB_SSL_CA (pinned Supabase root CA) or DB_SSL_REJECT_UNAUTHORIZED=1 to enforce verify-full.",
    );
  }
  return { rejectUnauthorized: false };
}

// Pool-level operation/connection timeouts so a slow or hung DB cannot pin a
// serverless invocation. Overridable via env; conservative defaults.
function buildPgPoolTimeouts(env = process.env) {
  const num = (key, fallback) => {
    const parsed = Number(env[key]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    connectionTimeoutMillis: num("DB_CONNECT_TIMEOUT_MS", 5_000),
    idleTimeoutMillis: num("DB_IDLE_TIMEOUT_MS", 30_000),
    statement_timeout: num("DB_STATEMENT_TIMEOUT_MS", 10_000),
    query_timeout: num("DB_QUERY_TIMEOUT_MS", 10_000),
  };
}

module.exports = { buildPgSslConfig, buildPgPoolTimeouts };
