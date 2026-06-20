const { Pool } = require("pg");
const { buildPgSslConfig, buildPgPoolTimeouts } = require("./pgSsl");

let pool = null;

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  ).trim();
}

function normalizeConnectionString(connectionString) {
  return connectionString
    .replace(/([?&])channel_binding=[^&]*/gi, "$1")
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]+$/, "");
}

function getPool() {
  if (pool) return pool;

  const raw = getDatabaseUrl();
  const connectionString = normalizeConnectionString(raw);
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  pool = new Pool({
    connectionString,
    max: Number(process.env.DB_MAX_CONNS || 5),
    ssl: buildPgSslConfig({ rawConnectionString: raw }),
    ...buildPgPoolTimeouts(),
  });

  return pool;
}

async function query(sql, params = []) {
  return getPool().query(sql, params);
}

module.exports = { getPool, query };
