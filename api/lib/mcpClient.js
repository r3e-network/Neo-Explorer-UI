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

// Establishes (and caches per warm instance) a connected MCP client. A failed
// connect resets the cache so the next request retries rather than latching a
// rejected promise for the life of the instance.
async function getConnection() {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      const url = process.env.NEOX_MCP_URL;
      if (!url) throw new Error("mcp_unconfigured");
      const { Client, StreamableHTTPClientTransport } = await loadSdk();

      const requestInit = {};
      if (process.env.NEOX_MCP_BEARER) {
        requestInit.headers = { Authorization: `Bearer ${process.env.NEOX_MCP_BEARER}` };
      }

      const transport = new StreamableHTTPClientTransport(new URL(url), { requestInit });
      const client = new Client(
        { name: CLIENT_NAME, version: CLIENT_VERSION },
        { capabilities: {} },
      );
      await client.connect(transport);
      return { client, transport };
    })().catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
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

// Lists the MCP server's tools as Anthropic tool defs. Cached per warm instance;
// a failed list resets the cache so the next request retries.
async function listTools() {
  if (!toolDefsPromise) {
    toolDefsPromise = (async () => {
      const { client } = await getConnection();
      const result = await client.listTools(undefined, { timeout: LIST_TIMEOUT_MS });
      const tools = Array.isArray(result && result.tools) ? result.tools : [];
      return tools
        .filter((tool) => tool && typeof tool.name === "string" && tool.name.length > 0)
        .map(toAnthropicToolDef);
    })().catch((err) => {
      toolDefsPromise = null;
      throw err;
    });
  }
  return toolDefsPromise;
}

// Executes an MCP tool and returns its result content array (the Anthropic
// tool_result `content` shape: an array of { type:"text", text }, etc.). The
// optional signal lets the caller abort in-flight work.
async function callTool(name, input, signal) {
  const { client } = await getConnection();
  const result = await client.callTool(
    { name, arguments: input && typeof input === "object" ? input : {} },
    undefined,
    { timeout: TOOL_TIMEOUT_MS, signal },
  );
  return Array.isArray(result && result.content) ? result.content : [];
}

module.exports = { listTools, callTool, toAnthropicToolDef };
