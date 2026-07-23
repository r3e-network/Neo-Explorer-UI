import { beforeEach, describe, expect, it, vi } from "vitest";

// The BYOK provider seam reads useAgentSettings() (P2's composable). We mock it
// so askAgent's header behavior is exercised without touching real storage.
// `settings.current` is a plain snapshot; the mock wraps each field as a
// ref-like { value } to mirror the real composable's shape.
const settings = vi.hoisted(() => ({
  current: { mode: "hosted", apiKey: "", model: "", baseUrl: "" },
}));

vi.mock("../../src/composables/useAgentSettings.js", () => ({
  useAgentSettings: () => ({
    mode: { value: settings.current.mode },
    apiKey: { value: settings.current.apiKey },
    model: { value: settings.current.model },
    baseUrl: { value: settings.current.baseUrl },
  }),
}));

function useByok({ apiKey = "sk-user-123", model = "", baseUrl = "" } = {}) {
  settings.current = { mode: "byok", apiKey, model, baseUrl };
}

function ok200(json = { answer: "", toolUses: [], proposals: [] }) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => json });
}

describe("agentService.askAgent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Default every test to the hosted provider unless it opts into BYOK.
    settings.current = { mode: "hosted", apiKey: "", model: "", baseUrl: "" };
  });

  it("returns the parsed answer/toolUses/proposals on a 200 response", async () => {
    const proposal = { proposal: true, chain: "neox", kind: "eth_tx", tx: {} };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        answer: "Here is your balance.",
        toolUses: ["get_balance"],
        proposals: [proposal],
        model: "claude",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askAgent } = await import("../../src/services/agentService.js");
    const result = await askAgent({ query: "what is my balance", chain: "neox" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/agent");
    expect(options.method).toBe("POST");
    expect(options.headers.Accept).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({ query: "what is my balance", chain: "neox" });

    expect(result).toEqual({
      answer: "Here is your balance.",
      toolUses: ["get_balance"],
      proposals: [proposal],
      // Passed through so the tool trail can attribute the answer to a model.
      model: "claude",
    });
  });

  it("prefers messages over query when both are supplied", async () => {
    const fetchMock = ok200();
    vi.stubGlobal("fetch", fetchMock);

    const { askAgent } = await import("../../src/services/agentService.js");
    const messages = [{ role: "user", content: "hi" }];
    await askAgent({ messages, query: "ignored", chain: "both" });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ messages, chain: "both" });
  });

  it("returns an unavailable state (not throw) on a 503 unconfigured response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ unavailable: true, reason: "agent_unconfigured" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askAgent } = await import("../../src/services/agentService.js");
    const result = await askAgent({ query: "hello" });

    expect(result).toEqual({ unavailable: true, reason: "agent_unconfigured" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an unavailable state on a 502 upstream error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ unavailable: true, reason: "agent_upstream_error" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askAgent } = await import("../../src/services/agentService.js");
    const result = await askAgent({ query: "hello" });

    expect(result).toEqual({ unavailable: true, reason: "agent_upstream_error" });
  });

  it("throws a typed AgentServiceError on a network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("connection refused"));
    vi.stubGlobal("fetch", fetchMock);

    const { askAgent, AgentServiceError } = await import("../../src/services/agentService.js");

    await expect(askAgent({ query: "hello" })).rejects.toBeInstanceOf(AgentServiceError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on an unexpected non-2xx status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { askAgent, AgentServiceError } = await import("../../src/services/agentService.js");
    await expect(askAgent({ query: "hello" })).rejects.toBeInstanceOf(AgentServiceError);
  });

  describe("provider headers", () => {
    it("attaches no BYOK headers in hosted mode", async () => {
      const fetchMock = ok200();
      vi.stubGlobal("fetch", fetchMock);

      const { askAgent } = await import("../../src/services/agentService.js");
      await askAgent({ query: "hi" });

      const { headers, body } = fetchMock.mock.calls[0][1];
      expect(headers.Accept).toBe("application/json");
      expect(headers["Content-Type"]).toBe("application/json");
      expect("X-Agent-Key" in headers).toBe(false);
      expect("X-Agent-Model" in headers).toBe(false);
      expect("X-Agent-Base-Url" in headers).toBe(false);
      // Body is untouched by provider resolution.
      expect(JSON.parse(body)).toEqual({ query: "hi" });
    });

    it("sends only X-Agent-Key in BYOK mode when model and base URL are unset", async () => {
      useByok({ apiKey: "sk-user-123" });
      const fetchMock = ok200();
      vi.stubGlobal("fetch", fetchMock);

      const { askAgent } = await import("../../src/services/agentService.js");
      await askAgent({ query: "hi", chain: "n3" });

      const { headers, body } = fetchMock.mock.calls[0][1];
      expect(headers["X-Agent-Key"]).toBe("sk-user-123");
      expect("X-Agent-Model" in headers).toBe(false);
      expect("X-Agent-Base-Url" in headers).toBe(false);
      // Standard headers and the body still go out unchanged.
      expect(headers.Accept).toBe("application/json");
      expect(JSON.parse(body)).toEqual({ query: "hi", chain: "n3" });
    });

    it("sends all three BYOK headers when model and base URL are set", async () => {
      useByok({
        apiKey: "sk-user-123",
        model: "claude-custom",
        baseUrl: "https://api.anthropic.com",
      });
      const fetchMock = ok200();
      vi.stubGlobal("fetch", fetchMock);

      const { askAgent } = await import("../../src/services/agentService.js");
      await askAgent({ query: "hi" });

      const { headers } = fetchMock.mock.calls[0][1];
      expect(headers["X-Agent-Key"]).toBe("sk-user-123");
      expect(headers["X-Agent-Model"]).toBe("claude-custom");
      expect(headers["X-Agent-Base-Url"]).toBe("https://api.anthropic.com");
    });

    it("falls back to hosted (no headers) when byok is selected but the key is blank", async () => {
      settings.current = { mode: "byok", apiKey: "   ", model: "x", baseUrl: "y" };
      const fetchMock = ok200();
      vi.stubGlobal("fetch", fetchMock);

      const { askAgent } = await import("../../src/services/agentService.js");
      await askAgent({ query: "hi" });

      const { headers } = fetchMock.mock.calls[0][1];
      expect("X-Agent-Key" in headers).toBe(false);
      expect("X-Agent-Model" in headers).toBe(false);
      expect("X-Agent-Base-Url" in headers).toBe(false);
    });

    it("keeps the return shape and model passthrough identical in BYOK mode", async () => {
      useByok({ apiKey: "sk-user-123" });
      const proposal = { proposal: true, chain: "neox", kind: "eth_tx", tx: {} };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          answer: "Balance is 10 GAS.",
          toolUses: ["get_balance"],
          proposals: [proposal],
          model: "deepseek-user",
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { askAgent } = await import("../../src/services/agentService.js");
      const result = await askAgent({ query: "balance?" });

      expect(result).toEqual({
        answer: "Balance is 10 GAS.",
        toolUses: ["get_balance"],
        proposals: [proposal],
        model: "deepseek-user",
      });
    });

    it("keeps 502/503 unavailable handling identical in BYOK mode", async () => {
      useByok({ apiKey: "sk-user-123" });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ unavailable: true, reason: "agent_unconfigured" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const { askAgent } = await import("../../src/services/agentService.js");
      const result = await askAgent({ query: "hi" });

      expect(result).toEqual({ unavailable: true, reason: "agent_unconfigured" });
    });
  });
});
