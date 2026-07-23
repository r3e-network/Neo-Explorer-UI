import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SDK doubles. `mocks` is hoisted so the vi.mock factories below can close over
// it; every field is a vi.fn so tests can drive per-call behaviour and assert
// how many times the SDK was actually touched (connects, transports built,
// list/callTool round-trips, teardown).
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  listTools: vi.fn(),
  callTool: vi.fn(),
  clientClose: vi.fn(),
  transportCtor: vi.fn(),
  terminateSession: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class {
    constructor(info, options) {
      this.info = info;
      this.options = options;
    }
    async connect(transport) {
      mocks.connect(transport);
      // Mirror the real SDK: Protocol.connect() assigns the transport's
      // onclose/onerror handlers, which mcpClient must WRAP rather than clobber.
      transport.onclose = () => {};
      transport.onerror = () => {};
    }
    listTools(...args) {
      return mocks.listTools(...args);
    }
    callTool(...args) {
      return mocks.callTool(...args);
    }
    close(...args) {
      return mocks.clientClose(...args);
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: class {
    constructor(url, options) {
      this.url = url;
      this.options = options;
      this.onclose = undefined;
      this.onerror = undefined;
      mocks.transportCtor(url, options, this);
    }
    terminateSession(...args) {
      return mocks.terminateSession(...args);
    }
    async close() {}
  },
}));

// A StreamableHTTPError-/McpError-shaped error: detection keys off the numeric
// `.code`, not the class, so this faithfully reproduces the session-loss signal.
function sessionLostError(code) {
  const err = new Error(`session lost: ${code}`);
  err.code = code;
  return err;
}

function lastTransport() {
  const calls = mocks.transportCtor.mock.calls;
  return calls.length ? calls[calls.length - 1][2] : null;
}

async function loadClient() {
  const mod = await import("../../api/lib/mcpClient.js");
  // mcpClient is CommonJS; unwrap the interop default the same way agent.js does.
  return mod && typeof mod.listTools === "function" ? mod : mod.default || mod;
}

describe("api/lib/mcpClient session-loss recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NEOX_MCP_URL", "https://mcp.example/neo");
    vi.stubEnv("NEOX_MCP_BEARER", "bearer-secret");
    // Sensible happy-path defaults; individual tests override as needed.
    mocks.listTools.mockResolvedValue({
      tools: [{ name: "get_block_count", description: "count", inputSchema: { type: "object" } }],
    });
    mocks.callTool.mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("(a) recovers from a 404 on callTool: one reconnect + one retry, then succeeds", async () => {
    const { callTool } = await loadClient();
    mocks.callTool
      .mockRejectedValueOnce(sessionLostError(404))
      .mockResolvedValueOnce({ content: [{ type: "text", text: "recovered" }] });

    const content = await callTool("get_block_count", {});

    expect(content).toEqual([{ type: "text", text: "recovered" }]);
    expect(mocks.callTool).toHaveBeenCalledTimes(2); // initial + single retry
    expect(mocks.connect).toHaveBeenCalledTimes(2); // exactly one reconnect
    expect(mocks.transportCtor).toHaveBeenCalledTimes(2); // fresh transport rebuilt
  });

  it("(a') also treats JSON-RPC -32001 / -32000 / 401 as recoverable session loss", async () => {
    for (const code of [-32001, -32000, 401]) {
      vi.resetModules();
      vi.clearAllMocks();
      mocks.callTool
        .mockRejectedValueOnce(sessionLostError(code))
        .mockResolvedValueOnce({ content: [{ type: "text", text: `ok-${code}` }] });
      const { callTool } = await loadClient();

      const content = await callTool("get_block_count", {});
      expect(content).toEqual([{ type: "text", text: `ok-${code}` }]);
      expect(mocks.callTool).toHaveBeenCalledTimes(2);
    }
  });

  it("(b) surfaces a persistent session failure after a single retry (no infinite loop)", async () => {
    const { callTool } = await loadClient();
    mocks.callTool.mockRejectedValue(sessionLostError(-32001));

    await expect(callTool("get_block_count", {})).rejects.toThrow(/session lost/);
    // initial attempt + exactly one retry, then it gives up.
    expect(mocks.callTool).toHaveBeenCalledTimes(2);
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });

  it("(b') does NOT retry a non-session error (e.g. bad params)", async () => {
    const { callTool } = await loadClient();
    const badParams = sessionLostError(-32602); // InvalidParams — not session loss
    mocks.callTool.mockRejectedValueOnce(badParams);

    await expect(callTool("get_block_count", {})).rejects.toBe(badParams);
    expect(mocks.callTool).toHaveBeenCalledTimes(1); // no retry
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });

  it("(c) session loss on callTool clears BOTH the connection and tool-def caches", async () => {
    const { listTools, callTool } = await loadClient();

    // Prime both caches on one connection.
    await listTools();
    expect(mocks.listTools).toHaveBeenCalledTimes(1);
    expect(mocks.connect).toHaveBeenCalledTimes(1);

    // A 404 during callTool must reset the connection (forcing a reconnect)...
    mocks.callTool
      .mockRejectedValueOnce(sessionLostError(404))
      .mockResolvedValueOnce({ content: [] });
    await callTool("get_block_count", {});
    expect(mocks.connect).toHaveBeenCalledTimes(2); // connectionPromise was cleared + rebuilt
    expect(mocks.transportCtor).toHaveBeenCalledTimes(2);

    // ...and must also invalidate the tool-def cache, so the next listTools
    // re-fetches from the (reused) reconnected session instead of serving stale
    // defs from a dead session.
    await listTools();
    expect(mocks.listTools).toHaveBeenCalledTimes(2); // toolDefsPromise was cleared
    expect(mocks.connect).toHaveBeenCalledTimes(2); // reconnected session reused, no 3rd connect
  });

  it("(d) rejects a non-https, non-loopback URL before building any transport", async () => {
    vi.stubEnv("NEOX_MCP_URL", "http://mcp.example.com/mcp");
    const { listTools } = await loadClient();

    await expect(listTools()).rejects.toThrow("mcp_insecure_url");
    expect(mocks.transportCtor).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("(d') allows plaintext ONLY for loopback hosts", async () => {
    for (const url of ["http://127.0.0.1:3001/mcp", "http://localhost:3001/mcp", "http://[::1]:3001/mcp"]) {
      vi.resetModules();
      vi.clearAllMocks();
      vi.stubEnv("NEOX_MCP_URL", url);
      mocks.listTools.mockResolvedValue({ tools: [] });
      const { listTools } = await loadClient();

      await expect(listTools()).resolves.toEqual([]);
      expect(mocks.transportCtor).toHaveBeenCalledTimes(1);
    }
  });

  it("(e) happy path caches: one connect + one transport for N calls", async () => {
    const { listTools, callTool } = await loadClient();

    await listTools();
    await callTool("get_block_count", {});
    await callTool("get_block_count", { index: 1 });
    await listTools();

    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.transportCtor).toHaveBeenCalledTimes(1);
    expect(mocks.listTools).toHaveBeenCalledTimes(1); // tool defs served from cache
    expect(mocks.callTool).toHaveBeenCalledTimes(2);
  });

  it("(e') attaches the bearer to the transport requestInit", async () => {
    const { listTools } = await loadClient();
    await listTools();
    const [, options] = mocks.transportCtor.mock.calls[0];
    expect(options.requestInit.headers.Authorization).toBe("Bearer bearer-secret");
  });

  it("evicts the cache when the transport closes on its own (onclose wrapper)", async () => {
    const { listTools } = await loadClient();
    await listTools();
    expect(mocks.connect).toHaveBeenCalledTimes(1);

    // Simulate the transport closing for any reason: the wrapped onclose must
    // clear the caches so the dead transport is never handed out again.
    const transport = lastTransport();
    expect(typeof transport.onclose).toBe("function");
    transport.onclose();

    await listTools();
    expect(mocks.connect).toHaveBeenCalledTimes(2); // rebuilt after close
    expect(mocks.transportCtor).toHaveBeenCalledTimes(2);
  });

  it("a stale transport's late onclose does NOT evict a freshly rebuilt connection", async () => {
    const { listTools, callTool } = await loadClient();
    await listTools();
    const stale = lastTransport();

    // Force a reconnect via session loss.
    mocks.callTool
      .mockRejectedValueOnce(sessionLostError(404))
      .mockResolvedValueOnce({ content: [] });
    await callTool("get_block_count", {});
    expect(mocks.connect).toHaveBeenCalledTimes(2);

    // The old transport closes belatedly — it must not clear the new cache.
    stale.onclose();
    await listTools();
    expect(mocks.connect).toHaveBeenCalledTimes(2); // still the rebuilt connection
  });

  it("close() terminates the server-side session and drops the cache", async () => {
    const { listTools, close } = await loadClient();
    await listTools();
    expect(mocks.transportCtor).toHaveBeenCalledTimes(1);

    await close();
    expect(mocks.terminateSession).toHaveBeenCalledTimes(1); // issues the DELETE
    expect(mocks.clientClose).toHaveBeenCalledTimes(1);

    // Cache was cleared: the next use rebuilds.
    await listTools();
    expect(mocks.transportCtor).toHaveBeenCalledTimes(2);
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });

  it("close() is a safe no-op when never connected", async () => {
    const { close } = await loadClient();
    await expect(close()).resolves.toBeUndefined();
    expect(mocks.terminateSession).not.toHaveBeenCalled();
  });
});
