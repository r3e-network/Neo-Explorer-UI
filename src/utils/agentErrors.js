// Maps a thrown agent failure onto a stable, translatable UI state.
//
// The agent panel used to render one generic "something went wrong" line for
// every failure, which is actively misleading: a 413 (conversation too long)
// can never succeed on retry, while a 429 only succeeds after a cooldown.
// Classifying the failure lets the transcript show honest copy and decide
// whether a Retry button is worth offering at all.
//
// Pure module: no DOM writes, no Vue, no i18n instance. It returns an i18n key
// and the caller renders it through the panel's `tf(key, fallback)` helper.

/**
 * How long a `rateLimited` failure should stay un-retryable in the UI before a
 * Retry has any chance of succeeding. The backend limiter is per-minute, so a
 * 15s cooldown is the shortest wait that is worth offering.
 */
export const RETRY_COOLDOWN_MS = 15000;

// kind → { i18nKey, retryable }. Frozen so a consumer cannot mutate the table
// shared by every classification.
const CLASSIFICATIONS = Object.freeze({
  rateLimited: Object.freeze({
    kind: "rateLimited",
    i18nKey: "agent.errorRateLimited",
    retryable: true,
  }),
  tooLong: Object.freeze({
    kind: "tooLong",
    i18nKey: "agent.errorTooLong",
    // A 413 is deterministic: the same conversation will always be too long.
    // Offering Retry here is a button that is guaranteed to fail.
    retryable: false,
  }),
  offline: Object.freeze({
    kind: "offline",
    i18nKey: "agent.errorOffline",
    retryable: true,
  }),
  generic: Object.freeze({
    kind: "generic",
    i18nKey: "agent.errorGeneric",
    retryable: true,
  }),
});

function readStatus(error) {
  const status = error?.status;
  return typeof status === "number" && Number.isFinite(status) ? status : undefined;
}

// `askAgent` throws `AgentServiceError` without a `status` only when `fetch`
// itself rejected — i.e. the request never reached the server. Duck-typed
// rather than `instanceof` so a re-imported module registry (vi.resetModules)
// or a structured-cloned error still classifies correctly.
function isTransportFailure(error) {
  return error?.name === "AgentServiceError" || error?.code === "agent_request_failed";
}

function isBrowserOffline() {
  const nav = globalThis.navigator;
  return Boolean(nav) && nav.onLine === false;
}

function readDetail(error) {
  const message = error?.message;
  if (typeof message !== "string") return "";
  return message.trim();
}

/**
 * Classify a failure thrown by `askAgent` into a UI state.
 *
 * `detail` is the raw error message. It is only ever surfaced inside a
 * collapsed `<details>` disclosure — never in the headline, where a stack-ish
 * string reads as a crash rather than as a recoverable condition.
 *
 * @param {unknown} error - Anything thrown by the request path (may be null).
 * @returns {{kind: "rateLimited"|"tooLong"|"offline"|"generic",
 *   i18nKey: string, retryable: boolean, detail: string}}
 */
export function classifyAgentError(error) {
  const detail = readDetail(error);
  const status = readStatus(error);

  // Status wins over connectivity: a 429 that arrived proves we are online.
  if (status === 429) return { ...CLASSIFICATIONS.rateLimited, detail };
  if (status === 413) return { ...CLASSIFICATIONS.tooLong, detail };

  if (isBrowserOffline() || (status === undefined && isTransportFailure(error))) {
    return { ...CLASSIFICATIONS.offline, detail };
  }

  return { ...CLASSIFICATIONS.generic, detail };
}

export default { classifyAgentError, RETRY_COOLDOWN_MS };
