// Read-only Neo N3 + Neo X blockchain AI agent orchestrator.
//
// P1 of the natural-language agent (see claudedocs/agent-architecture.md).
// The client POSTs a chat turn; this function runs a single Claude call that
// reaches the neo-n3-mcp remote MCP server via the Anthropic MCP connector.
// The connector executes MCP tools SERVER-SIDE (Anthropic's side), so there is
// no client-side tool loop here — we send the conversation once and read the
// final assistant text back.
//
// NON-CUSTODIAL, READ-ONLY: no writes, no signer, no wallet. The MCP server
// only exposes read/analyze tools; the model can never move funds. All secrets
// (Anthropic key, MCP bearer) are server-side and are never echoed back.

const { withApiTelemetry } = require("./lib/telemetry");
const { sendJson, methodNotAllowed } = require("./lib/http");
const { enforceSimpleRateLimit } = require("./lib/simpleRateLimit");

const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 4096;
const MCP_BETA = "mcp-client-2025-11-20";
const MCP_SERVER_NAME = "neo";

// Keep the request timeout comfortably under the 60s function budget so a hung
// upstream call is aborted before the platform kills the invocation.
const REQUEST_TIMEOUT_MS = 55_000;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.AGENT_RATE_LIMIT_PER_MINUTE || 20);

// Input hard caps — mirror the neox-rpc discipline.
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 8000;
const MAX_BODY_BYTES = 64 * 1024;

const NO_STORE = { "Cache-Control": "no-store" };

// Degraded payloads mirror the prices.js UNAVAILABLE shape: an expected,
// well-formed JSON body rather than a thrown 500.
const UNAVAILABLE_UNCONFIGURED_AGENT = { unavailable: true, reason: "agent_unconfigured" };
const UNAVAILABLE_UNCONFIGURED_MCP = { unavailable: true, reason: "mcp_unconfigured" };
const UNAVAILABLE_AGENT_UPSTREAM = { unavailable: true, reason: "agent_upstream_error" };

const REFUSAL_ANSWER =
  "I can't help with that request. I'm a read-only Neo N3 and Neo X explorer " +
  "assistant — ask me to look up blocks, transactions, addresses, balances, or " +
  "contracts and I'll fetch the on-chain data for you.";

const SYSTEM_PROMPT = [
  "You are a blockchain assistant for the Neo N3 and Neo X networks. You answer",
  "questions and help users prepare transactions by calling the connected `neo` MCP",
  "server's tools and summarizing what they return. You have no other data source.",
  "",
  "Hard rules:",
  "- NEVER fabricate or guess a hash, address, balance, block height, token amount,",
  "  or any other number. Every concrete value MUST come from a tool result. If a",
  "  tool did not return it, say you don't have it.",
  "- You are NON-CUSTODIAL: you never hold keys and you cannot sign, send, or",
  "  broadcast a transaction. For any action that moves funds or changes state, call",
  "  the construct tools to build an UNSIGNED transaction proposal and the simulate",
  "  tools to preview it, then present it for the user to review and sign in their",
  "  OWN wallet (NeoLine/WalletConnect for Neo N3, MetaMask for Neo X).",
  "- NEVER claim you executed, sent, submitted, or completed a transaction — you only",
  "  prepare it; the user signs. Say 'here's a transaction for you to review and",
  "  sign', never 'I sent it'.",
  "- Before presenting a constructed transaction, simulate it (test-invoke / gas",
  "  estimate) and surface the result and any risk you notice (large transfers,",
  "  unlimited approvals, unlabeled or unknown recipients).",
  "- Answer concisely in plain language. If a lookup fails or returns nothing, say so.",
].join("\n");

const CHAIN_HINTS = {
  n3: "The user is asking about the Neo N3 network. Prefer Neo N3 tools.",
  neox: "The user is asking about the Neo X (EVM-compatible) network. Prefer Neo X tools.",
  both: "The user may be asking about either Neo N3 or Neo X; pick tools by context.",
};

let anthropicModulePromise = null;

// Lazy ESM load, mirroring api/lib/telemetry.js's loadSentry pattern. Keeps the
// SDK off the hot path for the unconfigured/degraded branches.
async function loadAnthropic() {
  if (!anthropicModulePromise) {
    anthropicModulePromise = import("@anthropic-ai/sdk").then((mod) => mod.default || mod);
  }
  return anthropicModulePromise;
}

function normalizeChain(value) {
  const chain = String(value || "").trim().toLowerCase();
  if (chain === "n3" || chain === "neox" || chain === "both") return chain;
  return "both";
}

function buildSystemPrompt(chain) {
  return `${SYSTEM_PROMPT}\n\n${CHAIN_HINTS[chain] || CHAIN_HINTS.both}`;
}

// Reads the request body with a hard byte cap. Returns one of:
//   { status: "ok", value }   parsed JSON object
//   { status: "too_large" }   exceeded MAX_BODY_BYTES
//   { status: "invalid" }     missing or non-JSON body
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    let value = req.body;
    if (typeof value === "string") {
      if (Buffer.byteLength(value) > MAX_BODY_BYTES) return { status: "too_large" };
      try {
        value = JSON.parse(value);
      } catch (_err) {
        return { status: "invalid" };
      }
    }
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (_err) {
      return { status: "invalid" };
    }
    if (typeof serialized !== "string") return { status: "invalid" };
    if (Buffer.byteLength(serialized) > MAX_BODY_BYTES) return { status: "too_large" };
    return { status: "ok", value };
  }

  if (typeof req.on !== "function") return { status: "invalid" };

  const collected = await new Promise((resolve) => {
    let data = "";
    let overflowed = false;
    req.on("data", (chunk) => {
      if (overflowed) return;
      data += chunk;
      if (Buffer.byteLength(data) > MAX_BODY_BYTES) {
        overflowed = true;
        data = "";
      }
    });
    req.on("end", () => resolve(overflowed ? { status: "too_large" } : { status: "raw", raw: data }));
    req.on("error", () => resolve({ status: "invalid" }));
  });

  if (collected.status !== "raw") return collected;
  if (!collected.raw) return { status: "invalid" };
  try {
    return { status: "ok", value: JSON.parse(collected.raw) };
  } catch (_err) {
    return { status: "invalid" };
  }
}

// Validates and normalizes the request. Returns either
//   { error, status }                 reject with this status/message
//   { messages, chain }               validated Anthropic messages + chain hint
function validateRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object", status: 400 };
  }

  const chain = normalizeChain(body.chain);

  if (body.messages !== undefined) {
    if (!Array.isArray(body.messages)) {
      return { error: "messages must be an array", status: 400 };
    }
    if (body.messages.length === 0) {
      return { error: "messages must not be empty", status: 400 };
    }
    if (body.messages.length > MAX_MESSAGES) {
      return { error: "Too many messages", status: 413 };
    }
    const messages = [];
    for (const message of body.messages) {
      if (!message || typeof message !== "object" || Array.isArray(message)) {
        return { error: "Each message must be an object", status: 400 };
      }
      if (message.role !== "user" && message.role !== "assistant") {
        return { error: "Each message role must be 'user' or 'assistant'", status: 400 };
      }
      if (typeof message.content !== "string") {
        return { error: "Each message content must be a string", status: 400 };
      }
      if (message.content.length === 0) {
        return { error: "Message content must not be empty", status: 400 };
      }
      if (message.content.length > MAX_CONTENT_CHARS) {
        return { error: "Message content too large", status: 413 };
      }
      messages.push({ role: message.role, content: message.content });
    }
    return { messages, chain };
  }

  if (typeof body.query === "string") {
    if (body.query.trim().length === 0) {
      return { error: "query must not be empty", status: 400 };
    }
    if (body.query.length > MAX_CONTENT_CHARS) {
      return { error: "query too large", status: 413 };
    }
    return { messages: [{ role: "user", content: body.query }], chain };
  }

  return { error: "Provide a 'query' string or a 'messages' array", status: 400 };
}

function extractText(response) {
  const blocks = Array.isArray(response?.content) ? response.content : [];
  return blocks
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("")
    .trim();
}

function extractToolUses(response) {
  const blocks = Array.isArray(response?.content) ? response.content : [];
  return blocks
    .filter((block) => block?.type === "mcp_tool_use" || block?.type === "server_tool_use")
    .map((block) => block?.name)
    .filter((name) => typeof name === "string" && name.length > 0);
}

// Surface UNSIGNED transaction proposals returned by the MCP construct tools so
// the client can render them and route to the user's wallet. A proposal is the
// { proposal: true, chain, kind, ... } envelope the construct tools emit; it is
// never a signed or broadcast transaction (the server never signs). The MCP
// tool-result content may arrive as JSON text or as a structured value, so we
// probe both shapes defensively.
function extractProposals(response) {
  const blocks = Array.isArray(response?.content) ? response.content : [];
  const proposals = [];
  for (const block of blocks) {
    if (block?.type !== "mcp_tool_result") continue;
    const items = Array.isArray(block.content) ? block.content : [block.content];
    for (const item of items) {
      let candidate = null;
      if (item && typeof item === "object" && item.type === "text" && typeof item.text === "string") {
        try {
          candidate = JSON.parse(item.text);
        } catch {
          candidate = null;
        }
      } else if (item && typeof item === "object") {
        candidate = item;
      }
      if (candidate && candidate.proposal === true && typeof candidate.chain === "string") {
        proposals.push(candidate);
      }
    }
  }
  return proposals;
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, { Allow: "POST", ...NO_STORE });
  }

  // Expected-unconfigured cases degrade to 503 JSON instead of a raw 500.
  if (!process.env.ANTHROPIC_API_KEY) {
    return sendJson(res, 503, UNAVAILABLE_UNCONFIGURED_AGENT, NO_STORE);
  }
  if (!process.env.NEOX_MCP_URL) {
    return sendJson(res, 503, UNAVAILABLE_UNCONFIGURED_MCP, NO_STORE);
  }

  const parsed = await readBody(req);
  if (parsed.status === "too_large") {
    return sendJson(res, 413, { error: "Request body too large" }, NO_STORE);
  }
  if (parsed.status !== "ok") {
    return sendJson(res, 400, { error: "Request body must be valid JSON" }, NO_STORE);
  }

  const validated = validateRequest(parsed.value);
  if (validated.error) {
    return sendJson(res, validated.status, { error: validated.error }, NO_STORE);
  }

  if (
    !enforceSimpleRateLimit({
      req,
      res,
      prefix: "agent",
      key: validated.chain,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX,
    })
  ) {
    return undefined; // 429 already written by the limiter
  }

  const mcpServer = {
    type: "url",
    url: process.env.NEOX_MCP_URL,
    name: MCP_SERVER_NAME,
  };
  if (process.env.NEOX_MCP_BEARER) {
    mcpServer.authorization_token = process.env.NEOX_MCP_BEARER;
  }

  let response;
  try {
    const Anthropic = await loadAnthropic();
    const client = new Anthropic({ timeout: REQUEST_TIMEOUT_MS });
    response = await client.beta.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        betas: [MCP_BETA],
        mcp_servers: [mcpServer],
        tools: [{ type: "mcp_toolset", mcp_server_name: MCP_SERVER_NAME }],
        system: buildSystemPrompt(validated.chain),
        messages: validated.messages,
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );
  } catch (_err) {
    // Never leak the SDK error, the key, or the bearer.
    return sendJson(res, 502, UNAVAILABLE_AGENT_UPSTREAM, NO_STORE);
  }

  // A refusal stop_reason means content is not a normal answer; return a benign
  // message rather than reading blocks blindly.
  if (response?.stop_reason === "refusal") {
    return sendJson(
      res,
      200,
      { answer: REFUSAL_ANSWER, toolUses: [], model: response?.model || MODEL },
      NO_STORE,
    );
  }

  return sendJson(
    res,
    200,
    {
      answer: extractText(response),
      toolUses: extractToolUses(response),
      proposals: extractProposals(response),
      model: response?.model || MODEL,
    },
    NO_STORE,
  );
}

module.exports = withApiTelemetry("agent", handler);
module.exports.config = {
  runtime: "nodejs",
  maxDuration: 60,
};
