// Client for the in-app AI agent panel — the non-custodial write agent's brain.
//
// Talks to the serverless orchestrator at POST /api/agent. The agent only ever
// *proposes* unsigned transactions; the user signs in their own wallet (see
// utils/proposalSigner.js). This module carries no keys and never signs.
//
// Backend contract:
//   POST /api/agent { messages?, query?, chain? }
//     → 200 { answer, toolUses, proposals, model }
//     → 503 { unavailable: true, reason: "agent_unconfigured"|"mcp_unconfigured" }
//     → 502 { unavailable: true, reason: "agent_upstream_error" }

const AGENT_ENDPOINT = "/api/agent";

// 502/503 are graceful "feature not available" states — the panel renders a
// friendly message rather than an error, so askAgent resolves instead of throws.
const UNAVAILABLE_STATUSES = new Set([502, 503]);

/** Thrown for network faults or unexpected/unparseable agent responses. */
export class AgentServiceError extends Error {
  constructor(message, { cause, status } = {}) {
    super(message);
    this.name = "AgentServiceError";
    this.code = "agent_request_failed";
    if (status !== undefined) this.status = status;
    if (cause !== undefined) this.cause = cause;
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeReason(payload) {
  const reason = typeof payload?.reason === "string" ? payload.reason.trim() : "";
  return reason || "agent_unavailable";
}

/**
 * Ask the agent orchestrator a question. Sends `messages` when a conversation
 * is provided, otherwise the single `query`. One request, no retries.
 *
 * @param {Object} params
 * @param {Array<{role:string, content:string}>} [params.messages] - Conversation so far.
 * @param {string} [params.query] - Single-shot question (used when no messages).
 * @param {"n3"|"neox"|"both"} [params.chain] - Target chain scope.
 * @param {AbortSignal} [params.signal] - Cancels the in-flight request.
 * @returns {Promise<{answer:string, toolUses:string[], proposals:Array}
 *   | {unavailable:true, reason:string}>}
 * @throws {AgentServiceError} on network faults or unexpected responses.
 */
export async function askAgent({ messages, query, chain, signal } = {}) {
  const body = {};
  if (Array.isArray(messages) && messages.length > 0) {
    body.messages = messages;
  } else if (typeof query === "string" && query.trim()) {
    body.query = query.trim();
  }
  if (chain) body.chain = chain;

  let response;
  try {
    response = await fetch(AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    throw new AgentServiceError(`Agent request failed: ${error?.message || "network error"}`, {
      cause: error,
    });
  }

  if (UNAVAILABLE_STATUSES.has(response.status)) {
    const payload = await readJson(response);
    return { unavailable: true, reason: normalizeReason(payload) };
  }

  if (!response.ok) {
    throw new AgentServiceError(`Agent request failed with status ${response.status}`, {
      status: response.status,
    });
  }

  const payload = await readJson(response);
  if (!payload || typeof payload !== "object") {
    throw new AgentServiceError("Agent returned an unparseable response");
  }

  return {
    answer: typeof payload.answer === "string" ? payload.answer : "",
    toolUses: Array.isArray(payload.toolUses) ? payload.toolUses : [],
    proposals: Array.isArray(payload.proposals) ? payload.proposals : [],
  };
}

export default { askAgent };
