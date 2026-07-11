const { createHash } = require("node:crypto");
const { query: defaultQuery } = require("./db");

const CREATE_TABLE_SQL = `
create table if not exists api_rate_limit_windows (
  key_hash text not null check (length(key_hash) = 64),
  window_start_ms bigint not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  primary key (key_hash, window_start_ms)
)`;

const CREATE_EXPIRY_INDEX_SQL = `
create index if not exists idx_api_rate_limit_windows_expires_at
  on api_rate_limit_windows(expires_at)`;

const CONSUME_SQL = `
insert into api_rate_limit_windows (key_hash, window_start_ms, request_count, expires_at)
values ($1, $2, 1, $3)
on conflict (key_hash, window_start_ms) do update set
  request_count = api_rate_limit_windows.request_count + 1,
  expires_at = greatest(api_rate_limit_windows.expires_at, excluded.expires_at)
returning request_count`;

const CLEANUP_SQL = `
delete from api_rate_limit_windows
where ctid in (
  select ctid
  from api_rate_limit_windows
  where expires_at < now()
  order by expires_at asc
  limit 1000
)`;

function normalizePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function hasPostgresRateLimitConfig(env = process.env) {
  return Boolean(String(env?.DATABASE_URL || env?.POSTGRES_URL || "").trim());
}

function hashRateLimitKey(key) {
  return createHash("sha256").update(String(key || "unknown-key")).digest("hex");
}

function createPostgresRateLimiter({
  queryImpl = defaultQuery,
  cleanupEvery = 100,
  logPrefix = "[PostgresRateLimit]",
} = {}) {
  if (typeof queryImpl !== "function") {
    throw new Error("Postgres rate limiter requires a query implementation");
  }

  let ensurePromise = null;
  let consumeCalls = 0;
  let lastCleanupLogAt = 0;

  async function ensureSchema() {
    if (!ensurePromise) {
      ensurePromise = (async () => {
        await queryImpl(CREATE_TABLE_SQL);
        await queryImpl(CREATE_EXPIRY_INDEX_SQL);
      })();
    }
    try {
      await ensurePromise;
    } catch (error) {
      ensurePromise = null;
      throw error;
    }
  }

  async function cleanupExpiredWindows() {
    try {
      await queryImpl(CLEANUP_SQL);
    } catch (error) {
      const now = Date.now();
      if (now - lastCleanupLogAt >= 60_000) {
        lastCleanupLogAt = now;
        console.warn(`${logPrefix} expired-window cleanup failed: ${error?.message || error}`);
      }
    }
  }

  return {
    isShared: true,
    provider: "postgres",

    async consume({ key, windowMs, maxRequests, nowMs = Date.now() }) {
      const policyWindowMs = normalizePositiveInt(windowMs, 60_000);
      const policyMax = normalizePositiveInt(maxRequests, 20);
      const effectiveNowMs = Number.isFinite(Number(nowMs)) ? Math.trunc(Number(nowMs)) : Date.now();
      const windowStartMs = Math.floor(effectiveNowMs / policyWindowMs) * policyWindowMs;
      const resetAtMs = windowStartMs + policyWindowMs;

      await ensureSchema();
      const result = await queryImpl(CONSUME_SQL, [
        hashRateLimitKey(key),
        windowStartMs,
        new Date(resetAtMs),
      ]);
      const count = Number(result?.rows?.[0]?.request_count);
      if (!Number.isFinite(count) || count <= 0) {
        throw new Error("Invalid Postgres limiter response");
      }

      consumeCalls += 1;
      const cleanupInterval = normalizePositiveInt(cleanupEvery, 0);
      if (cleanupInterval > 0 && consumeCalls % cleanupInterval === 0) {
        await cleanupExpiredWindows();
      }

      return {
        allowed: count <= policyMax,
        limit: policyMax,
        remaining: Math.max(0, policyMax - count),
        resetAtMs,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - effectiveNowMs) / 1000)),
      };
    },

    getTrackedKeyCount() {
      return 0;
    },
  };
}

module.exports = {
  createPostgresRateLimiter,
  hasPostgresRateLimitConfig,
  hashRateLimitKey,
};
