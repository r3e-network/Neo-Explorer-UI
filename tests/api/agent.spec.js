import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted so the mock factories below (which vitest hoists above everything)
// reference the SAME stable handles the tests drive — bare `const x = vi.fn()`
// would leave the factory referencing an uninitialised var and the mock would
// silently not register, letting the real SDK / MCP transport run.
const { createMock, listToolsMock, callToolMock, clientOptions } = vi.hoisted(() => ({
  createMock: vi.fn(),
  listToolsMock: vi.fn(),
  callToolMock: vi.fn(),
  clientOptions: { value: undefined },
}));

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    constructor(options) {
      clientOptions.value = options;
      this.messages = { create: createMock };
    }
  }
  return { default: Anthropic };
});

// Mock the MCP client so no real transport/connection is attempted.
vi.mock("../../api/lib/mcpClient.js", () => ({
  listTools: listToolsMock,
  callTool: callToolMock,
}));

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = JSON.stringify(value);
      return this;
    },
    end(chunk = "") {
      this.body += chunk;
      return this;
    },
    getJson() {
      return this.body ? JSON.parse(this.body) : null;
    },
  };
}

function createRequest({ method = "POST", body } = {}) {
  return {
    method,
    body,
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  };
}

async function loadHandler() {
  const mod = await import("../../api/agent.js");
  return mod.default || mod;
}

describe("api/agent", () => {
  beforeEach(() => {
    vi.resetModules();
    createMock.mockReset();
    listToolsMock.mockReset();
    callToolMock.mockReset();
    clientOptions.value = undefined;
    // A sensible default tool list; individual tests override as needed.
    listToolsMock.mockResolvedValue([
      { name: "get_block_count", description: "N3 height", input_schema: { type: "object", properties: {} } },
    ]);
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("DEEPSEEK_BASE_URL", "");
    vi.stubEnv("AGENT_MODEL", "");
    vi.stubEnv("NEOX_MCP_URL", "");
    vi.stubEnv("NEOX_MCP_BEARER", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects non-POST methods with 405", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const handler = await loadHandler();
    const res = createMockRes();

    await handler(createRequest({ method: "GET" }), res);

    expect(res.statusCode).toBe(405);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("degrades to 503 agent_unconfigured when the DeepSeek key is missing", async () => {
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const handler = await loadHandler();
    const res = createMockRes();

    await handler(createRequest({ body: { query: "height?" } }), res);

    expect(res.statusCode).toBe(503);
    expect(res.getJson()).toEqual({ unavailable: true, reason: "agent_unconfigured" });
    expect(createMock).not.toHaveBeenCalled();
    expect(listToolsMock).not.toHaveBeenCalled();
  });

  it("degrades to 503 mcp_unconfigured when the MCP URL is missing", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    const handler = await loadHandler();
    const res = createMockRes();

    await handler(createRequest({ body: { query: "height?" } }), res);

    expect(res.statusCode).toBe(503);
    expect(res.getJson()).toEqual({ unavailable: true, reason: "mcp_unconfigured" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("runs the tool loop: executes callTool for a tool_use block and returns the final answer", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    vi.stubEnv("NEOX_MCP_BEARER", "bearer-secret");

    // First create() → the model calls a tool; second → final answer.
    createMock
      .mockResolvedValueOnce({
        model: "deepseek-v4-flash",
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "tu_1", name: "get_block_count", input: {} }],
      })
      .mockResolvedValueOnce({
        model: "deepseek-v4-flash",
        stop_reason: "end_turn",
        content: [
          { type: "text", text: "The current N3 block height is " },
          { type: "text", text: "12345." },
        ],
      });
    callToolMock.mockResolvedValueOnce([{ type: "text", text: "12345" }]);

    const handler = await loadHandler();
    const res = createMockRes();
    await handler(createRequest({ body: { query: "What is the N3 block height?", chain: "n3" } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.getJson()).toEqual({
      answer: "The current N3 block height is 12345.",
      toolUses: ["get_block_count"],
      proposals: [],
      model: "deepseek-v4-flash",
    });

    // The MCP tool was actually invoked with the model's block name + input.
    expect(callToolMock).toHaveBeenCalledTimes(1);
    expect(callToolMock).toHaveBeenCalledWith("get_block_count", {});

    // Two create() calls: initial + post-tool.
    expect(createMock).toHaveBeenCalledTimes(2);

    // DeepSeek client + request shape.
    expect(clientOptions.value.apiKey).toBe("sk-test");
    expect(clientOptions.value.baseURL).toBe("https://api.deepseek.com/anthropic");

    const [payload] = createMock.mock.calls[0];
    expect(payload.model).toBe("deepseek-v4-flash");
    expect(payload.tools).toEqual([
      { name: "get_block_count", description: "N3 height", input_schema: { type: "object", properties: {} } },
    ]);
    // No Anthropic-only / MCP-connector fields leak into the DeepSeek request.
    expect(payload.betas).toBeUndefined();
    expect(payload.mcp_servers).toBeUndefined();
    expect(payload.output_config).toBeUndefined();
    expect(payload.thinking).toBeUndefined();

    // The second call carried the appended assistant + tool_result turns.
    const [secondPayload] = createMock.mock.calls[1];
    expect(secondPayload.messages).toEqual([
      { role: "user", content: "What is the N3 block height?" },
      { role: "assistant", content: [{ type: "tool_use", id: "tu_1", name: "get_block_count", input: {} }] },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "tu_1", content: [{ type: "text", text: "12345" }] }],
      },
    ]);
  });

  it("surfaces unsigned transaction proposals from MCP construct tool results", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const proposal = {
      proposal: true,
      chain: "neox",
      kind: "eth_tx",
      tx: { from: "0xabc", to: "0xdef", value: "0x1", data: "0x", chainId: "0xba93", gas: "0x5208" },
      summary: "Transfer 1 wei",
    };
    listToolsMock.mockResolvedValue([
      { name: "x_build_transfer", description: "build", input_schema: { type: "object", properties: {} } },
    ]);
    createMock
      .mockResolvedValueOnce({
        model: "deepseek-v4-flash",
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "tu_x", name: "x_build_transfer", input: { to: "0xdef" } }],
      })
      .mockResolvedValueOnce({
        model: "deepseek-v4-flash",
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Here's a transfer for you to review and sign." }],
      });
    // MCP construct tool returns the proposal envelope as JSON text.
    callToolMock.mockResolvedValueOnce([{ type: "text", text: JSON.stringify(proposal) }]);

    const handler = await loadHandler();
    const res = createMockRes();
    await handler(createRequest({ body: { query: "send 1 wei to 0xdef", chain: "neox" } }), res);

    expect(res.statusCode).toBe(200);
    const json = res.getJson();
    expect(json.proposals).toEqual([proposal]);
    expect(json.answer).toBe("Here's a transfer for you to review and sign.");
    expect(json.toolUses).toEqual(["x_build_transfer"]);
    // The response must never carry a signature, key, or broadcast result.
    expect(JSON.stringify(json)).not.toMatch(/signature|privateKey|rawTransaction|sendRawTransaction/i);
  });

  it("rejects an oversized body with 413", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const handler = await loadHandler();
    const res = createMockRes();

    // Content over the per-message 8000-char cap.
    await handler(createRequest({ body: { query: "x".repeat(8001) } }), res);

    expect(res.statusCode).toBe(413);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects an empty/malformed body with 400", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const handler = await loadHandler();
    const res = createMockRes();

    await handler(createRequest({ body: {} }), res);

    expect(res.statusCode).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("degrades to 502 without leaking secrets when the SDK throws", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-secret-key");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    vi.stubEnv("NEOX_MCP_BEARER", "bearer-secret");
    createMock.mockRejectedValueOnce(new Error("boom sk-secret-key bearer-secret"));

    const handler = await loadHandler();
    const res = createMockRes();
    await handler(createRequest({ body: { query: "height?" } }), res);

    expect(res.statusCode).toBe(502);
    expect(res.getJson()).toEqual({ unavailable: true, reason: "agent_upstream_error" });
    const raw = res.body;
    expect(raw).not.toContain("sk-secret-key");
    expect(raw).not.toContain("bearer-secret");
  });

  it("returns a benign answer on a refusal stop_reason instead of crashing", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    createMock.mockResolvedValueOnce({
      model: "deepseek-v4-flash",
      stop_reason: "refusal",
      content: [],
    });

    const handler = await loadHandler();
    const res = createMockRes();
    await handler(createRequest({ body: { query: "do something disallowed" } }), res);

    expect(res.statusCode).toBe(200);
    const json = res.getJson();
    expect(json.model).toBe("deepseek-v4-flash");
    expect(json.toolUses).toEqual([]);
    expect(json.proposals).toEqual([]);
    expect(typeof json.answer).toBe("string");
    expect(json.answer.length).toBeGreaterThan(0);
    expect(callToolMock).not.toHaveBeenCalled();
  });
});

describe("api/lib/mcpClient toAnthropicToolDef", () => {
  it("converts an MCP tool descriptor to an Anthropic tool def", async () => {
    // Import the real module (bypassing the suite-level mock) for a unit check.
    const mod = await vi.importActual("../../api/lib/mcpClient.js");
    const def = mod.toAnthropicToolDef({
      name: "get_block_count",
      description: "Return the N3 block height",
      inputSchema: { type: "object", properties: { chain: { type: "string" } } },
    });
    expect(def).toEqual({
      name: "get_block_count",
      description: "Return the N3 block height",
      input_schema: { type: "object", properties: { chain: { type: "string" } } },
    });

    // Missing schema/description degrade to a safe default object schema.
    const bare = mod.toAnthropicToolDef({ name: "ping" });
    expect(bare).toEqual({ name: "ping", input_schema: { type: "object", properties: {} } });
    expect(bare.description).toBeUndefined();
  });
});
