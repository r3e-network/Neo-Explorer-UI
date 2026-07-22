import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Shared handle to the mocked create() so each test can control its behavior.
const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    constructor(options) {
      this.options = options;
      this.beta = { messages: { create: createMock } };
    }
  }
  return { default: Anthropic };
});

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
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("NEOX_MCP_URL", "");
    vi.stubEnv("NEOX_MCP_BEARER", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects non-POST methods with 405", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const handler = await loadHandler();
    const res = createMockRes();

    await handler(createRequest({ method: "GET" }), res);

    expect(res.statusCode).toBe(405);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("degrades to 503 agent_unconfigured when the API key is missing", async () => {
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const handler = await loadHandler();
    const res = createMockRes();

    await handler(createRequest({ body: { query: "height?" } }), res);

    expect(res.statusCode).toBe(503);
    expect(res.getJson()).toEqual({ unavailable: true, reason: "agent_unconfigured" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("degrades to 503 mcp_unconfigured when the MCP URL is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    const handler = await loadHandler();
    const res = createMockRes();

    await handler(createRequest({ body: { query: "height?" } }), res);

    expect(res.statusCode).toBe(503);
    expect(res.getJson()).toEqual({ unavailable: true, reason: "mcp_unconfigured" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns 200 with the concatenated answer, tool uses, and model", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    vi.stubEnv("NEOX_MCP_BEARER", "bearer-secret");
    createMock.mockResolvedValueOnce({
      model: "claude-opus-4-8",
      stop_reason: "end_turn",
      content: [
        { type: "mcp_tool_use", name: "get_block_count" },
        { type: "text", text: "The current N3 block height is " },
        { type: "text", text: "12345." },
      ],
    });

    const handler = await loadHandler();
    const res = createMockRes();
    await handler(createRequest({ body: { query: "What is the N3 block height?", chain: "n3" } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.getJson()).toEqual({
      answer: "The current N3 block height is 12345.",
      toolUses: ["get_block_count"],
      proposals: [],
      model: "claude-opus-4-8",
    });

    // MCP connector request shape.
    expect(createMock).toHaveBeenCalledTimes(1);
    const [payload] = createMock.mock.calls[0];
    expect(payload.model).toBe("claude-opus-4-8");
    expect(payload.betas).toEqual(["mcp-client-2025-11-20"]);
    expect(payload.tools).toEqual([{ type: "mcp_toolset", mcp_server_name: "neo" }]);
    expect(payload.mcp_servers).toEqual([
      {
        type: "url",
        url: "https://mcp.example/neo",
        name: "neo",
        authorization_token: "bearer-secret",
      },
    ]);
    expect(payload.messages).toEqual([{ role: "user", content: "What is the N3 block height?" }]);
    expect(payload.thinking).toEqual({ type: "adaptive" });
    expect(payload.output_config).toEqual({ effort: "low" });
  });

  it("surfaces unsigned transaction proposals from MCP tool results", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const proposal = {
      proposal: true,
      chain: "neox",
      kind: "eth_tx",
      tx: { from: "0xabc", to: "0xdef", value: "0x1", data: "0x", chainId: "0xba93", gas: "0x5208" },
      summary: "Transfer 1 wei",
    };
    createMock.mockResolvedValueOnce({
      model: "claude-opus-4-8",
      stop_reason: "end_turn",
      content: [
        { type: "mcp_tool_use", name: "x_build_transfer" },
        // MCP tool results arrive as JSON text inside a content array.
        { type: "mcp_tool_result", content: [{ type: "text", text: JSON.stringify(proposal) }] },
        { type: "text", text: "Here's a transfer for you to review and sign." },
      ],
    });

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
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const handler = await loadHandler();
    const res = createMockRes();

    // Content over the per-message 8000-char cap.
    await handler(createRequest({ body: { query: "x".repeat(8001) } }), res);

    expect(res.statusCode).toBe(413);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects an empty/malformed body with 400", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    const handler = await loadHandler();
    const res = createMockRes();

    await handler(createRequest({ body: {} }), res);

    expect(res.statusCode).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("degrades to 502 without leaking secrets when the SDK throws", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-secret-key");
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
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    createMock.mockResolvedValueOnce({
      model: "claude-opus-4-8",
      stop_reason: "refusal",
      content: [],
    });

    const handler = await loadHandler();
    const res = createMockRes();
    await handler(createRequest({ body: { query: "do something disallowed" } }), res);

    expect(res.statusCode).toBe(200);
    const json = res.getJson();
    expect(json.model).toBe("claude-opus-4-8");
    expect(json.toolUses).toEqual([]);
    expect(typeof json.answer).toBe("string");
    expect(json.answer.length).toBeGreaterThan(0);
  });
});
