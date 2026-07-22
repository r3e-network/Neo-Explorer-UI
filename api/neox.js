// Neo X (Blockscout v2) read-only REST proxy.
//
// The client calls `/neox/<net>/<resource...>` (see src/services/neox/
// blockscoutClient.js). A vercel.json rewrite maps the named path parameters
// to this stable function so we can allowlist paths, rate-limit, time out, and degrade
// gracefully instead of letting the SPA talk to the third-party explorer
// directly. Mirrors the shape of api/network-monitor.js + api/prices.js.

const { withApiTelemetry } = require("./lib/telemetry");
const { sendJson, methodNotAllowed } = require("./lib/http");
const { enforceSimpleRateLimit } = require("./lib/simpleRateLimit");
const { NO_STORE_HEADERS, neoXRestProfile, publicCacheHeaders } = require("./lib/cachePolicy");

module.exports.config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const UPSTREAM_BASES = {
  mainnet: process.env.NEOX_MAINNET_BLOCKSCOUT_BASE || "https://xexplorer.neo.org/api/v2",
  testnet: process.env.NEOX_TESTNET_BLOCKSCOUT_BASE || "https://xt4scan.ngd.network/api/v2",
};

// Only read-only Blockscout v2 collections are proxied. The first path segment
// after the net must be one of these.
const ALLOWED_TOP_SEGMENTS = new Set([
  "blocks",
  "transactions",
  "addresses",
  "tokens",
  "smart-contracts",
  "search",
  "stats",
  "main-page",
]);

const FETCH_TIMEOUT_MS = 8000;
const MAX_PATH_SEGMENTS = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.NEOX_RATE_LIMIT_PER_MINUTE || 120);

const UNAVAILABLE_PAYLOAD = { error: "Neo X explorer upstream unavailable" };

const ALLOWED_QUERY_KEYS = new Set([
  "q",
  "type",
  "filter",
  "sort",
  "order",
  "block_number",
  "index",
  "items_count",
  "hash",
  "transactions_count",
  "fetched_coin_balance",
  "name",
  "fiat_value",
  "contract_address_hash",
  "market_cap",
  "holders_count",
  "holder_count",
  "is_name_null",
  "smart_contract_id",
  "token_id",
  "log_index",
  "transaction_index",
  // ERC-1155 batched token-transfer cursor: Blockscout emits these four keys
  // together in next_page_params (see token_transfers_next_page_params). All
  // must be allowlisted or 'load more' 400s once a batch straddles a page edge.
  "batch_log_index",
  "batch_block_hash",
  "batch_transaction_hash",
  "index_in_batch",
  "id",
  "address_hash",
  "unique_token",
  "value",
  // Address-transaction list cursor: Blockscout's /addresses/{h}/transactions
  // next_page_params carries inserted_at + fee alongside the base keys. Both
  // must be allowlisted or 'load more' 400s once an address exceeds one page.
  "inserted_at",
  "fee",
  // Transaction state-changes cursor: Blockscout's define_state_changes_paging_params
  // emits {state_changes, items_count}. items_count is above; state_changes is the
  // offset key, needed so state-changes 'load more' survives past 50 changes.
  "state_changes",
]);

function hasValidQuery(query) {
  return Object.entries(query || {}).every(([key, value]) => {
    if (key === "net" || key === "path") return true;
    if (!ALLOWED_QUERY_KEYS.has(key) || Array.isArray(value)) return false;
    return String(value ?? "").length <= 512;
  });
}

function buildQueryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (key === "net" || key === "path") continue; // rewrite params, not upstream query
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function splitPath(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item || "").split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, { Allow: "GET", ...NO_STORE_HEADERS });
  }

  const net = String(firstQueryValue(req.query?.net) || "").trim();
  const rest = splitPath(req.query?.path);

  if (!UPSTREAM_BASES[net]) {
    return sendJson(res, 400, { error: "Unsupported Neo X network" }, NO_STORE_HEADERS);
  }
  if (rest.length === 0 || rest.length > MAX_PATH_SEGMENTS) {
    return sendJson(res, 400, { error: "Unsupported Neo X path" }, NO_STORE_HEADERS);
  }
  if (!ALLOWED_TOP_SEGMENTS.has(rest[0])) {
    return sendJson(res, 400, { error: "Unsupported Neo X resource" }, NO_STORE_HEADERS);
  }
  if (rest.some((segment) => segment.includes("..") || segment.includes("/") || segment.includes("\\"))) {
    return sendJson(res, 400, { error: "Invalid Neo X path" }, NO_STORE_HEADERS);
  }
  if (!hasValidQuery(req.query)) {
    return sendJson(res, 400, { error: "Unsupported Neo X query" }, NO_STORE_HEADERS);
  }

  if (
    !enforceSimpleRateLimit({
      req,
      res,
      prefix: "neox",
      key: net,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX,
    })
  ) {
    return undefined; // 429 already written by the limiter
  }

  const upstreamPath = rest.map((segment) => encodeURIComponent(segment)).join("/");
  const upstreamUrl = `${UPSTREAM_BASES[net]}/${upstreamPath}${buildQueryString(req.query)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!upstream.ok) {
      // A missing resource must stay a 404 (empty state), not an outage banner.
      const status = upstream.status === 404 ? 404 : 502;
      return sendJson(res, status, UNAVAILABLE_PAYLOAD, NO_STORE_HEADERS);
    }
    const payload = await upstream.json();
    return sendJson(res, 200, payload, publicCacheHeaders(neoXRestProfile(rest)));
  } catch (_err) {
    return sendJson(res, 502, UNAVAILABLE_PAYLOAD, NO_STORE_HEADERS);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = withApiTelemetry("neox", handler);
