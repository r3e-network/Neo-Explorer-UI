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
// (www.neo3scan.com), the apex (neo3scan.com), and this project's own Vercel
// preview domains, while still blocking every third-party origin. Non-browser
// callers (curl, server-to-server) are allowed through when no Origin/Referer
// is present and `allowNoOrigin` is true, since those callers are already
// capable of any request and the threat model here is browser CSRF, not API
// auth.
//
// Preview scoping (finding #19): previously ANY `*.vercel.app` host was
// admitted, so an attacker who deploys anything to `attacker.vercel.app` could
// bypass the CSRF fence. We now only admit THIS project's own preview domains,
// which look like `neo-explorer-ui-<hash>-<team>.vercel.app`, plus the current
// deployment's own host as reported by Vercel via VERCEL_URL /
// VERCEL_BRANCH_URL. Every foreign vercel.app host is rejected.

const DEFAULT_ALLOWED_HOSTS = [
  "www.neo3scan.com",
  "neo3scan.com",
  "neo-explorer-ui.vercel.app",
];

// Project-scoped Vercel preview pattern. Vercel names preview deployments
// `<project>-<hash>-<team>.vercel.app`; this project's slug is
// `neo-explorer-ui`. Requiring the `neo-explorer-ui-` prefix means a foreign
// deployment (attacker.vercel.app, someone-else-xyz.vercel.app) does NOT match.
// The `neo-explorer-ui.vercel.app` production alias (no trailing hash segment)
// is handled by DEFAULT_ALLOWED_HOSTS, not this pattern.
const PROJECT_PREVIEW_HOST_PATTERN = /^neo-explorer-ui-[a-z0-9-]+\.vercel\.app$/i;

// Strip an optional scheme (and any path) from a Vercel-injected host value.
// Vercel usually injects VERCEL_URL as a bare host, but be defensive.
function hostFromEnvValue(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  // If it parses as an absolute URL, take the hostname; otherwise treat the
  // leading token (up to the first slash) as the host.
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return (u.hostname || "").toLowerCase();
  } catch {
    return raw.split("/")[0];
  }
}

function getOwnDeploymentHosts() {
  // Vercel injects these at runtime as the current deployment's own host.
  // Admitting them lets same-origin mutations work on any preview URL this
  // project is actually served from, without widening to foreign hosts.
  return [
    hostFromEnvValue(process.env.VERCEL_URL),
    hostFromEnvValue(process.env.VERCEL_BRANCH_URL),
  ].filter(Boolean);
}

function getConfiguredAllowedHosts() {
  const fromEnv = String(process.env.MULTISIG_ALLOWED_ORIGIN_HOSTS || "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  // An explicit override fully replaces the defaults AND disables the implicit
  // project-preview matching: an operator who pins the allowlist gets exactly
  // what they configured, nothing wider.
  if (fromEnv.length) {
    return { hosts: new Set(fromEnv), allowVercelPreview: false, ownHosts: new Set() };
  }
  return {
    hosts: new Set(DEFAULT_ALLOWED_HOSTS),
    allowVercelPreview: true,
    ownHosts: new Set(getOwnDeploymentHosts()),
  };
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

function isHostAllowed(host, { hosts, allowVercelPreview, ownHosts }) {
  if (!host) return false;
  if (hosts.has(host)) return true;
  if (!allowVercelPreview) return false;
  // Only this project's own deployment host (from VERCEL_URL / VERCEL_BRANCH_URL)
  // or a host matching this project's preview naming pattern is admitted.
  // Foreign `*.vercel.app` hosts (attacker.vercel.app, etc.) are rejected.
  if (ownHosts && ownHosts.has(host)) return true;
  if (PROJECT_PREVIEW_HOST_PATTERN.test(host)) return true;
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
    PROJECT_PREVIEW_HOST_PATTERN,
    getConfiguredAllowedHosts,
    extractHost,
    originHostForRequest,
    isHostAllowed,
  },
};
