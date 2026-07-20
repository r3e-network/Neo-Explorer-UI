// Shared cache policy for public, read-only explorer data.
//
// Cache-Control governs browsers, while the CDN-specific headers keep Vercel
// and Cloudflare on a longer edge TTL. Do not add `s-maxage` here: Cloudflare
// treats it as proxy-revalidate, which disables stale-while-revalidate.

const NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
});

const PROFILES = Object.freeze({
  head: Object.freeze({ browser: 1, edge: 2, swr: 6, staleIfError: 15 }),
  mempool: Object.freeze({ browser: 1, edge: 2, swr: 5, staleIfError: 10 }),
  live: Object.freeze({ browser: 3, edge: 8, swr: 24, staleIfError: 60 }),
  list: Object.freeze({ browser: 5, edge: 15, swr: 45, staleIfError: 120 }),
  account: Object.freeze({ browser: 10, edge: 30, swr: 90, staleIfError: 300 }),
  detail: Object.freeze({ browser: 30, edge: 120, swr: 600, staleIfError: 1800 }),
  immutable: Object.freeze({ browser: 300, edge: 3600, swr: 86400, staleIfError: 86400 }),
  chart: Object.freeze({ browser: 300, edge: 3600, swr: 86400, staleIfError: 86400 }),
  policy: Object.freeze({ browser: 60, edge: 300, swr: 3600, staleIfError: 86400 }),
  historicalCall: Object.freeze({ browser: 300, edge: 86400, swr: 604800, staleIfError: 604800 }),
});

function cacheValue({ maxAge, swr, staleIfError }) {
  return [
    "public",
    `max-age=${maxAge}`,
    `stale-while-revalidate=${swr}`,
    `stale-if-error=${staleIfError}`,
  ].join(", ");
}

function publicCacheHeaders(profileName) {
  const profile = PROFILES[profileName];
  if (!profile) throw new Error(`Unknown cache profile: ${profileName}`);

  const browserValue = cacheValue({
    maxAge: profile.browser,
    swr: Math.max(profile.swr, profile.browser),
    staleIfError: profile.staleIfError,
  });
  const edgeValue = cacheValue({
    maxAge: profile.edge,
    swr: profile.swr,
    staleIfError: profile.staleIfError,
  });

  return {
    "Cache-Control": browserValue,
    "CDN-Cache-Control": edgeValue,
    "Cloudflare-CDN-Cache-Control": edgeValue,
    "Vercel-CDN-Cache-Control": edgeValue,
  };
}

function neoXRestProfile(rest) {
  const [resource, id, child] = rest;

  if (resource === "main-page" || resource === "stats" || resource === "search") return "live";
  if (!id) return "list";

  if (resource === "blocks" || resource === "transactions") {
    if (child && ["logs", "internal-transactions", "state-changes", "token-transfers"].includes(child)) {
      return "immutable";
    }
    return "detail";
  }

  if (resource === "addresses") return "account";
  if (resource === "tokens" || resource === "smart-contracts") return "detail";
  return "list";
}

function neoXRpcProfile(method, params) {
  if (method === "eth_blockNumber") return "head";
  if (method === "txpool_status") return "mempool";
  if (method === "eth_gasPrice") return "live";
  if (method === "eth_envelopeFee") return "policy";
  if (method === "eth_call" && /^0x[0-9a-f]+$/i.test(String(params?.[1] || ""))) return "historicalCall";
  return null;
}

module.exports = {
  NO_STORE_HEADERS,
  PROFILES,
  publicCacheHeaders,
  neoXRestProfile,
  neoXRpcProfile,
};
