import { beforeEach, describe, expect, it, vi } from "vitest";

describe("agentService.askAgent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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
    });
  });

  it("prefers messages over query when both are supplied", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ answer: "", toolUses: [], proposals: [] }),
    });
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
});
