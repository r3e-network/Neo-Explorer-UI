// Provider seam for the in-app AI agent client.
//
// Resolves which LLM billing credential a single request should use and what
// extra HTTP headers that implies. Two providers sit behind one seam:
//   - hosted (default): the server uses its own key; the browser sends nothing.
//   - byok: the user runs on their own LLM account; the browser attaches the
//     key (+ optional model / allowlisted base URL) as request headers, which
//     the server uses for that one request and never stores or logs.
//
// This module is pure and holds no secrets of its own: it only reshapes a
// settings snapshot into the header extras for one request. It never logs. The
// header NAMES are the contract with the backend (api/agent.js) — do not rename.
// The base URL is forwarded verbatim; the SSRF allowlist is enforced server-side.

const HEADER_KEY = "X-Agent-Key";
const HEADER_MODEL = "X-Agent-Model";
const HEADER_BASE_URL = "X-Agent-Base-Url";

/** Coerce a possibly-undefined value to a trimmed string; non-strings → "". */
function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolve the request extras contributed by the active provider.
 *
 * Pure and side-effect free — no fetch, no logging, no storage. BYOK is only
 * active when the mode is "byok" AND a non-empty key is present; anything else
 * (empty key, unknown mode, missing settings) falls back to hosted, so a
 * half-configured byok state can never produce a broken request.
 *
 * @param {Object} [settings]
 * @param {'hosted'|'byok'} [settings.mode]
 * @param {string} [settings.apiKey]  - BYOK secret; only its presence is checked here.
 * @param {string} [settings.model]   - optional model override ('' = provider default).
 * @param {string} [settings.baseUrl] - optional allowlisted base URL ('' = default).
 * @returns {{ mode: 'hosted'|'byok', headers: Record<string,string> }}
 *   headers is {} for hosted; for byok it carries X-Agent-Key plus X-Agent-Model
 *   and X-Agent-Base-Url only when those values are non-empty.
 */
export function resolveProvider(settings) {
  const apiKey = asText(settings?.apiKey);
  const wantsByok = settings?.mode === "byok";

  if (!wantsByok || apiKey === "") {
    return { mode: "hosted", headers: {} };
  }

  const headers = { [HEADER_KEY]: apiKey };

  const model = asText(settings?.model);
  if (model) headers[HEADER_MODEL] = model;

  const baseUrl = asText(settings?.baseUrl);
  if (baseUrl) headers[HEADER_BASE_URL] = baseUrl;

  return { mode: "byok", headers };
}

export default { resolveProvider };
