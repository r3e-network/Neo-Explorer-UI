// MCP client for the remote neo-n3-mcp server.
//
// DeepSeek's Anthropic-compatible endpoint does NOT support the Anthropic MCP
// connector (server-side `mcp_servers`), so the orchestrator drives CLIENT-SIDE
// tool use instead: api/agent.js fetches this server's tool list, exposes them
// to the model as Anthropic tool defs, and executes each tool call by proxying
// to the MCP server over the Streamable HTTP transport.
//
// NON-CUSTODIAL, READ-ONLY: the neo-n3-mcp server only exposes read / simulate /
// construct tools; construct tools return UNSIGNED proposals. This module never
// signs or broadcasts, and the bearer token stays server-side (never returned).

const CLIENT_NAME = "neo-explorer-agent";
const CLIENT_VERSION = "1.0.0";

// Per-call bounds so a hung MCP round-trip is aborted well under the function
// budget rather than tying up the whole invocation.
const TOOL_TIMEOUT_MS = 45_000;
const LIST_TIMEOUT_MS = 15_000;

let sdkPromise = null;
let connectionPromise = null;
let toolDefsPromise = null;
// The resolved { client, transport } currently cached. Used so a transport that
// closes/errors only evicts the cache when it is still the active connection —
// a stale transport's late onclose must never nuke a freshly rebuilt one.
let currentConnection = null;

// Lazy ESM load of the MCP SDK, mirroring the Anthropic SDK's lazy import in
// api/agent.js. Keeps the SDK off the hot path for degraded/unconfigured calls.
async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import("@modelcontextprotocol/sdk/client/index.js"),
      import("@modelcontextprotocol/sdk/client/streamableHttp.js"),
    ]).then(([clientMod, transportMod]) => ({
      Client: clientMod.Client,
      StreamableHTTPClientTransport: transportMod.StreamableHTTPClientTransport,
    }));
  }
  return sdkPromise;
}

// True for loopback hosts, mirroring the loopback exception neo-n3-mcp itself
// uses for its NEO_ALLOW_INSECURE_RPC guard. `new URL(...).hostname` keeps IPv6
// literals bracketed ("[::1]").
function isLoopbackHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

// Reject a plaintext transport URL unless it targets loopback: the shared MCP
// bearer is the sole credential guarding the whole tool surface and must never
// travel in cleartext across the network. Copying the local http URL into a
// production deployment and only swapping the hostname is the natural mistake
// this guards against.
function assertSecureMcpUrl(parsed) {
  if (parsed.protocol === "https:") return;
  if (parsed.protocol === "http:" && isLoopbackHost(parsed.hostname)) return;
  throw new Error("mcp_insecure_url");
}

// Drop both caches so the next getConnection() rebuilds a fresh transport.
function clearCaches() {
  connectionPromise = null;
  toolDefsPromise = null;
  currentConnection = null;
}

// Builds and connects a fresh MCP client + transport.
async function openConnection() {
  const url = process.env.NEOX_MCP_URL;
  if (!url) throw new Error("mcp_unconfigured");
  const parsed = new URL(url);
  assertSecureMcpUrl(parsed);
  const { Client, StreamableHTTPClientTransport } = await loadSdk();

  const requestInit = {};
  if (process.env.NEOX_MCP_BEARER) {
    requestInit.headers = { Authorization: `Bearer ${process.env.NEOX_MCP_BEARER}` };
  }

  const transport = new StreamableHTTPClientTransport(parsed, { requestInit });
  const client = new Client(
    { name: CLIENT_NAME, version: CLIENT_VERSION },
    { capabilities: {} },
  );
  await client.connect(transport);

  const conn = { client, transport };
  currentConnection = conn;

  // client.connect() overwrote transport.onclose/onerror with the protocol's
  // own handlers; wrap (don't replace) them so a transport that closes for any
  // reason evicts the cache and is never handed out again.
  const priorOnClose = transport.onclose;
  transport.onclose = () => {
    if (typeof priorOnClose === "function") priorOnClose();
    if (currentConnection === conn) clearCaches();
  };
  const priorOnError = transport.onerror;
  transport.onerror = (err) => {
    if (typeof priorOnError === "function") priorOnError(err);
  };

  return conn;
}

// Establishes (and caches per warm instance) a connected MCP client. A failed
// connect resets the cache so the next request retries rather than latching a
// rejected promise for the life of the instance.
function getConnection() {
  if (!connectionPromise) {
    const attempt = openConnection();
    connectionPromise = attempt;
    // Detached cleanup: if THIS attempt fails, drop it from the cache so the
    // next request retries. Does not swallow the rejection for the caller, who
    // awaits `attempt` (via connectionPromise) directly.
    attempt.catch(() => {
      if (connectionPromise === attempt) clearCaches();
    });
  }
  return connectionPromise;
}

// Recognises the error shapes that mean the server-side session is gone and the
// cached transport can only be recovered by rebuilding it. A lost session is a
// RECOVERABLE condition, not a permanent failure — the whole point of the retry.
//
// The SDK carries a numeric `.code` on both relevant error types:
//   - StreamableHTTPError.code is the HTTP status. A session evicted server-side
//     (idle-TTL sweep, MCP restart/redeploy, or non-sticky multi-replica
//     routing) answers 404 "Session not found"; an expired/invalid session
//     answers 401.
//   - McpError.code is the JSON-RPC code: -32000 ConnectionClosed (transport
//     torn down mid-request) and -32001 (the neo-n3-mcp "Session not found"
//     reply / SDK RequestTimeout).
function isSessionLossError(err) {
  if (!err) return false;
  const code = err.code;
  if (typeof code !== "number") return false;
  return code === 404 || code === 401 || code === -32000 || code === -32001;
}

// Runs `op`; on a session-loss error, resets both caches and retries EXACTLY
// once against a freshly rebuilt connection. A second failure propagates — no
// infinite loop, no silent degradation to "Tool execution failed." forever.
async function withSessionRetry(op) {
  try {
    return await op();
  } catch (err) {
    if (!isSessionLossError(err)) throw err;
    // Only the caller that observed the still-live cache logs, so a burst of
    // concurrent tool calls hitting the same dead session logs once, not N times.
    const hadLiveCache = connectionPromise !== null || toolDefsPromise !== null;
    clearCaches();
    if (hadLiveCache) {
      console.warn(
        `[mcpClient] MCP session lost (code=${err.code}); ` +
          "resetting connection cache and retrying once",
      );
    }
    return op();
  }
}

// Convert an MCP tool descriptor to an Anthropic tool definition
// ({ name, description?, input_schema }).
function toAnthropicToolDef(tool) {
  const inputSchema =
    tool && tool.inputSchema && typeof tool.inputSchema === "object"
      ? tool.inputSchema
      : { type: "object", properties: {} };
  const def = { name: tool.name, input_schema: inputSchema };
  if (typeof tool.description === "string" && tool.description.length > 0) {
    def.description = tool.description;
  }
  return def;
}

// Fetches and caches the tool defs for the current warm instance. A failed list
// resets the cache so the next request retries.
function getToolDefs() {
  if (!toolDefsPromise) {
    const attempt = (async () => {
      const { client } = await getConnection();
      const result = await client.listTools(undefined, { timeout: LIST_TIMEOUT_MS });
      const tools = Array.isArray(result && result.tools) ? result.tools : [];
      return tools
        .filter((tool) => tool && typeof tool.name === "string" && tool.name.length > 0)
        .map(toAnthropicToolDef);
    })();
    toolDefsPromise = attempt;
    attempt.catch(() => {
      if (toolDefsPromise === attempt) toolDefsPromise = null;
    });
  }
  return toolDefsPromise;
}

// Lists the MCP server's tools as Anthropic tool defs. Cached per warm instance,
// and the cache is tied to session-loss recovery so a redeployed tool surface
// (renamed/removed/added tools) is picked up rather than advertised stale.
async function listTools() {
  return withSessionRetry(() => getToolDefs());
}

// Executes an MCP tool and returns its result content array (the Anthropic
// tool_result `content` shape: an array of { type:"text", text }, etc.). The
// optional signal lets the caller abort in-flight work.
async function callTool(name, input, signal) {
  return withSessionRetry(async () => {
    const { client } = await getConnection();
    const result = await client.callTool(
      { name, arguments: input && typeof input === "object" ? input : {} },
      undefined,
      { timeout: TOOL_TIMEOUT_MS, signal },
    );
    return Array.isArray(result && result.content) ? result.content : [];
  });
}

// Best-effort teardown so a recycled instance frees its server-side session slot
// immediately instead of burning it for the full idle TTL. Only
// transport.terminateSession() issues the HTTP DELETE that reaches the server's
// destroySession path; client.close() alone sends nothing over the wire, so we
// do both. Safe to call when never connected.
async function close() {
  const attempt = connectionPromise;
  clearCaches();
  if (!attempt) return;
  let conn;
  try {
    conn = await attempt;
  } catch {
    return; // never established a session; nothing to terminate
  }
  const { client, transport } = conn;
  try {
    if (transport && typeof transport.terminateSession === "function") {
      await transport.terminateSession();
    }
  } catch {
    // best-effort: an already-lost session cannot be terminated
  }
  try {
    if (client && typeof client.close === "function") await client.close();
  } catch {
    // best-effort
  }
}

module.exports = { listTools, callTool, toAnthropicToolDef, close };
