// Same-origin guard for state-changing (mutation) serverless endpoints.
//
// Problem: the multisig create/update/signature endpoints are unauthenticated
// (feature-flag gated + IP rate-limited only) and previously sent
// `Access-Control-Allow-Origin: *`, which made them reachable cross-origin from
// any website a logged-in visitor opened. Because there is no session
// credential on these mutations, a cross-origin POST/PATCH could create
// proposals or overwrite `status`/`broadcast_tx_hash` on any request by id
// (CSRF).
//
// Fix: browsers cannot forge the `Origin` (or `Referer`) header on a
// cross-origin `fetch`/XHR. The legitimate explorer SPA always calls these
// endpoints via same-origin relative URLs (`/api/multisig/...`), so its
// `Origin` always equals the serving deployment host. We therefore reject any
// mutation whose `Origin`/`Referer` host is not in the explorer allowlist.
//
// This is deliberately a *host* (origin-less) comparison: it accepts any
// scheme/port of an allowed host so it works across the production apex
// (www.neo3scan.com), the apex (neo3scan.com), and Vercel preview domains,
// while still blocking every third-party origin. Non-browser callers (curl,
// server-to-server) are allowed through when no Origin/Referer is present and
// `allowNoOrigin` is true, since those callers are already capable of any
// request and the threat model here is browser CSRF, not API auth.

const DEFAULT_ALLOWED_HOSTS = [
  "www.neo3scan.com",
  "neo3scan.com",
  "neo-explorer-ui.vercel.app",
];

function getConfiguredAllowedHosts() {
  const fromEnv = String(process.env.MULTISIG_ALLOWED_ORIGIN_HOSTS || "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const base = fromEnv.length ? fromEnv : DEFAULT_ALLOWED_HOSTS;
  // Vercel preview domains look like <project>-<hash>-<team>.vercel.app;
  // always allow the whole *.vercel.app family so previews keep working
  // without per-deploy config.
  return { hosts: new Set(base), allowVercelPreview: true };
}

function getHeader(req, name) {
  const lower = name.toLowerCase();
  if (typeof req?.headers?.get === "function") {
    return req.headers.get(name) || req.headers.get(lower) || "";
  }
  return req?.headers?.[lower] || req?.headers?.[name] || "";
}

function extractHost(headerValue) {
  const raw = String(headerValue || "").trim();
  if (!raw) return "";
  try {
    // Origin/Referer are absolute URLs; URL parsing is the safe way to peel
    // the host without being fooled by path/query contents.
    const u = new URL(raw);
    return (u.hostname || "").toLowerCase();
  } catch {
    return "";
  }
}

function originHostForRequest(req) {
  // Origin is sent on CORS requests and on same-origin POST/PATCH. Prefer it;
  // fall back to Referer (sent on most navigations and same-origin fetches).
  return extractHost(getHeader(req, "origin")) || extractHost(getHeader(req, "referer"));
}

function isHostAllowed(host, { hosts, allowVercelPreview }) {
  if (!host) return false;
  if (hosts.has(host)) return true;
  if (allowVercelPreview && /\.vercel\.app$/i.test(host)) return true;
  return false;
}

// allowNoOrigin: when true (default), requests with NO Origin AND NO Referer
// are permitted. This covers legitimate non-browser callers (cron, curl,
// server-to-server) which are not a CSRF vector. Browser fetches always send
// Origin for non-simple requests, so a missing Origin on a POST/PATCH is not
// a real browser request.
function requireMutationFromExplorerOrigin(req, { allowNoOrigin = true } = {}) {
  const config = getConfiguredAllowedHosts();
  const host = originHostForRequest(req);
  if (!host) {
    // No Origin AND no Referer -> not a browser CSRF. Let it through so
    // server-side / CLI callers keep working; the feature-flag + rate-limit
    // gates still apply.
    return { ok: allowNoOrigin, reason: allowNoOrigin ? "" : "missing Origin/Referer" };
  }
  if (isHostAllowed(host, config)) {
    return { ok: true, reason: "" };
  }
  return { ok: false, reason: `disallowed origin host: ${host}` };
}

// Express-style middleware helper: returns true if the mutation is allowed,
// false if it already wrote a 403 response.
function enforceMutationSameOrigin(req, res) {
  const result = requireMutationFromExplorerOrigin(req);
  if (result.ok) return true;
  res.status(403).json({
    error: "Cross-origin mutations are not permitted on this endpoint.",
  });
  return false;
}

module.exports = {
  requireMutationFromExplorerOrigin,
  enforceMutationSameOrigin,
  // exported for tests
  _internal: {
    DEFAULT_ALLOWED_HOSTS,
    getConfiguredAllowedHosts,
    extractHost,
    originHostForRequest,
    isHostAllowed,
  },
};
