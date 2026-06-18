const { signClientInitMock, getCurrentEnvMock } = vi.hoisted(() => ({
  signClientInitMock: vi.fn(),
  getCurrentEnvMock: vi.fn(),
}));

vi.mock("@walletconnect/sign-client", () => ({
  default: { init: signClientInitMock },
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: getCurrentEnvMock,
  NET_ENV: { Mainnet: "mainnet", TestT5: "testT5" },
}));

let walletConnectService;
let mockClient;
const VALID_NEO_ADDRESS = "NNLi44dJNXtDNSBkofB48aTVYtb1zZrNEs";
const VALID_NEO_SCRIPT_HASH = "a5de523ae9d99be784a536e9412b7a3cbe049e1a";

function makeMockClient() {
  return {
    on: vi.fn(),
    connect: vi.fn(),
    request: vi.fn(),
    disconnect: vi.fn().mockResolvedValue(undefined),
    session: {
      getAll: vi.fn().mockReturnValue([]),
    },
  };
}

function emitClientEvent(name, payload = {}) {
  const handler = mockClient.on.mock.calls.find(([eventName]) => eventName === name)?.[1];
  if (typeof handler !== "function") throw new Error(`Missing mock listener for ${name}`);
  handler(payload);
}

describe("walletConnectService", () => {
  beforeEach(async () => {
    vi.resetModules();
    getCurrentEnvMock.mockReset().mockReturnValue("mainnet");
    mockClient = makeMockClient();
    signClientInitMock.mockReset().mockResolvedValue(mockClient);
    if (typeof globalThis.window === "undefined") {
      globalThis.window = { location: { origin: "https://test.example" } };
    }
    const mod = await import("@/services/walletConnectService");
    walletConnectService = mod.walletConnectService;
  });

  describe("init", () => {
    it("initializes the SignClient with project metadata once", async () => {
      await walletConnectService.init("test-project");
      expect(signClientInitMock).toHaveBeenCalledTimes(1);
      const arg = signClientInitMock.mock.calls[0][0];
      expect(arg.projectId).toBe("test-project");
      expect(arg.metadata.name).toBe("Neo Explorer");
    });

    it("is idempotent — second init() short-circuits", async () => {
      await walletConnectService.init("test-project");
      await walletConnectService.init("test-project");
      expect(signClientInitMock).toHaveBeenCalledTimes(1);
    });

    it("registers lifecycle listeners that keep the dapp session in sync", async () => {
      await walletConnectService.init("p");
      expect(mockClient.on).toHaveBeenCalledWith("session_delete", expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith("session_expire", expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith("session_update", expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith("session_event", expect.any(Function));
    });
  });

  describe("connect", () => {
    it("throws when client not initialized", async () => {
      await expect(walletConnectService.connect()).rejects.toThrow(/not initialized/i);
    });

    it("requests neo3:mainnet chain on mainnet env", async () => {
      await walletConnectService.init("p");
      mockClient.connect.mockResolvedValue({
        uri: "wc:abc",
        approval: () => Promise.resolve({ topic: "tp", namespaces: { neo3: { accounts: ["neo3:mainnet:NAddr"] } } }),
      });
      await walletConnectService.connect();
      expect(mockClient.connect).toHaveBeenCalledWith({
        requiredNamespaces: {
          neo3: {
            chains: ["neo3:mainnet"],
            methods: ["invokeFunction", "testInvoke", "signMessage"],
            events: ["accountChanged"],
          },
        },
      });
    });

    it("requests neo3:testnet on testnet env", async () => {
      getCurrentEnvMock.mockReturnValue("testT5");
      await walletConnectService.init("p");
      mockClient.connect.mockResolvedValue({
        uri: "wc:abc",
        approval: () => Promise.resolve({ topic: "tp", namespaces: { neo3: { accounts: ["neo3:testnet:NAddr"] } } }),
      });
      await walletConnectService.connect();
      expect(mockClient.connect.mock.calls[0][0].requiredNamespaces.neo3.chains).toEqual(["neo3:testnet"]);
    });

    it("returns uri and approval; resolving approval populates the session", async () => {
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: ["neo3:mainnet:NAddr"] } } };
      mockClient.connect.mockResolvedValue({ uri: "wc:xyz", approval: () => Promise.resolve(session) });
      const { uri, approval } = await walletConnectService.connect();
      expect(uri).toBe("wc:xyz");
      const result = await approval;
      expect(result).toBe(session);
      expect(walletConnectService.isConnected).toBe(true);
      expect(walletConnectService.account).toEqual({ address: "NAddr", label: "WalletConnect" });
    });

    it("rejects approval when the approved session chain differs from the Explorer network", async () => {
      getCurrentEnvMock.mockReturnValue("testT5");
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: ["neo3:mainnet:NAddr"] } } };
      mockClient.connect.mockResolvedValue({ uri: "wc:xyz", approval: () => Promise.resolve(session) });
      const { approval } = await walletConnectService.connect();

      await expect(approval).rejects.toThrow(/WalletConnect session is on neo3:mainnet/i);
      expect(walletConnectService.isConnected).toBe(false);
    });
  });

  describe("restoreSession", () => {
    it("throws when client not initialized", () => {
      expect(() => walletConnectService.restoreSession()).toThrow(/not initialized/i);
    });

    it("returns null when no session is available", async () => {
      await walletConnectService.init("p");
      mockClient.session.getAll.mockReturnValue([]);
      expect(walletConnectService.restoreSession()).toBeNull();
    });

    it("restores from the first session with neo3 accounts", async () => {
      await walletConnectService.init("p");
      mockClient.session.getAll.mockReturnValue([
        { topic: "stale", namespaces: {} }, // no accounts
        { topic: "good", namespaces: { neo3: { accounts: ["neo3:mainnet:NRestoredAddr"] } } },
      ]);
      const account = walletConnectService.restoreSession();
      expect(account).toEqual({ address: "NRestoredAddr", label: "WalletConnect" });
    });

    it("rejects restored sessions on the wrong network", async () => {
      getCurrentEnvMock.mockReturnValue("testT5");
      await walletConnectService.init("p");
      mockClient.session.getAll.mockReturnValue([
        { topic: "wrong", namespaces: { neo3: { accounts: ["neo3:mainnet:NRestoredAddr"] } } },
      ]);

      expect(() => walletConnectService.restoreSession()).toThrow(/WalletConnect session is on neo3:mainnet/i);
      expect(walletConnectService.isConnected).toBe(false);
    });

    it("returns existing account when session is already set (idempotent)", async () => {
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: ["neo3:mainnet:NA1"] } } };
      mockClient.connect.mockResolvedValue({ uri: "u", approval: () => Promise.resolve(session) });
      const { approval } = await walletConnectService.connect();
      await approval;
      mockClient.session.getAll.mockClear();
      const account = walletConnectService.restoreSession();
      expect(account).toEqual({ address: "NA1", label: "WalletConnect" });
      expect(mockClient.session.getAll).not.toHaveBeenCalled();
    });

    it("uses the account matching the current explorer network when a session has multiple neo3 accounts", async () => {
      await walletConnectService.init("p");
      mockClient.session.getAll.mockReturnValue([
        {
          topic: "multi",
          namespaces: {
            neo3: {
              accounts: ["neo3:testnet:NWrongNetwork", "neo3:mainnet:NMainAccount"],
            },
          },
        },
      ]);

      expect(walletConnectService.restoreSession()).toEqual({ address: "NMainAccount", label: "WalletConnect" });
      expect(walletConnectService.account).toEqual({ address: "NMainAccount", label: "WalletConnect" });
    });
  });

  describe("session lifecycle events", () => {
    async function setupConnectedSession() {
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: ["neo3:mainnet:NAddr"] } } };
      mockClient.connect.mockResolvedValue({ uri: "u", approval: () => Promise.resolve(session) });
      await (await walletConnectService.connect()).approval;
    }

    it("notifies listeners and clears state when the wallet deletes the session remotely", async () => {
      await setupConnectedSession();
      const listener = vi.fn();
      walletConnectService.onSessionChange(listener);

      emitClientEvent("session_delete", { topic: "tp" });

      expect(walletConnectService.isConnected).toBe(false);
      expect(walletConnectService.account).toBeNull();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: false,
          account: null,
          reason: "session_delete",
        }),
      );
    });

    it("updates the active account from session_update namespaces", async () => {
      await setupConnectedSession();
      const listener = vi.fn();
      walletConnectService.onSessionChange(listener);

      emitClientEvent("session_update", {
        topic: "tp",
        params: {
          namespaces: {
            neo3: {
              accounts: ["neo3:mainnet:NUpdated"],
            },
          },
        },
      });

      expect(walletConnectService.isConnected).toBe(true);
      expect(walletConnectService.account).toEqual({ address: "NUpdated", label: "WalletConnect" });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          account: { address: "NUpdated", label: "WalletConnect" },
          reason: "session_update",
        }),
      );
    });

    it("updates the active account from a WalletConnect accountChanged session_event", async () => {
      await setupConnectedSession();
      const listener = vi.fn();
      walletConnectService.onSessionChange(listener);

      emitClientEvent("session_event", {
        topic: "tp",
        chainId: "neo3:mainnet",
        event: {
          name: "accountChanged",
          data: "NEventAccount",
        },
      });

      expect(walletConnectService.account).toEqual({ address: "NEventAccount", label: "WalletConnect" });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          account: { address: "NEventAccount", label: "WalletConnect" },
          reason: "accountChanged",
        }),
      );
    });

    it("clears state when a session update moves the wallet to the wrong network", async () => {
      await setupConnectedSession();
      const listener = vi.fn();
      walletConnectService.onSessionChange(listener);

      emitClientEvent("session_update", {
        topic: "tp",
        params: {
          namespaces: {
            neo3: {
              accounts: ["neo3:testnet:NWrongNetwork"],
            },
          },
        },
      });

      expect(walletConnectService.isConnected).toBe(false);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: false,
          account: null,
          reason: "session_update",
          error: expect.any(Error),
        }),
      );
    });
  });

  describe("signMessage", () => {
    it("throws when not connected", async () => {
      await walletConnectService.init("p");
      await expect(walletConnectService.signMessage("hi")).rejects.toThrow(/not connected/i);
    });

    it("forwards to client.request with active chain", async () => {
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: ["neo3:mainnet:NAddr"] } } };
      mockClient.connect.mockResolvedValue({ uri: "u", approval: () => Promise.resolve(session) });
      await (await walletConnectService.connect()).approval;
      mockClient.request.mockResolvedValue("signed-payload");
      const result = await walletConnectService.signMessage("hello");
      expect(mockClient.request).toHaveBeenCalledWith({
        topic: "tp",
        chainId: "neo3:mainnet",
        request: { method: "signMessage", params: { message: "hello" } },
      });
      expect(result).toBe("signed-payload");
    });
  });

  describe("invoke", () => {
    async function setupConnected(chain = "mainnet", address = VALID_NEO_ADDRESS) {
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: [`neo3:${chain}:${address}`] } } };
      mockClient.connect.mockResolvedValue({ uri: "u", approval: () => Promise.resolve(session) });
      await (await walletConnectService.connect()).approval;
    }

    it("throws when not connected", async () => {
      await walletConnectService.init("p");
      await expect(walletConnectService.invoke({ scriptHash: "h", operation: "x" })).rejects.toThrow(/not connected/i);
    });

    it("normalizes a string txid response into { txid }", async () => {
      await setupConnected();
      mockClient.request.mockResolvedValue("0xabc123");
      const result = await walletConnectService.invoke({ scriptHash: "h", operation: "transfer" });
      expect(result).toEqual({ txid: "0xabc123" });
    });

    it("normalizes an object {txid: '...'} response", async () => {
      await setupConnected();
      mockClient.request.mockResolvedValue({ txid: "0xdef456", extra: 1 });
      const result = await walletConnectService.invoke({ scriptHash: "h", operation: "transfer" });
      expect(result).toEqual({ txid: "0xdef456" });
    });

    it("throws when the response shape lacks a string txid", async () => {
      await setupConnected();
      mockClient.request.mockResolvedValue({ status: "ok" });
      await expect(walletConnectService.invoke({ scriptHash: "h", operation: "x" })).rejects.toThrow(/no txid/i);
    });

    it("uses the session chain for the request", async () => {
      getCurrentEnvMock.mockReturnValue("testT5");
      await setupConnected("testnet");
      mockClient.request.mockResolvedValue("0xabc");
      await walletConnectService.invoke({ scriptHash: "h", operation: "transfer" });
      expect(mockClient.request.mock.calls[0][0].chainId).toBe("neo3:testnet");
    });

    it("blocks requests if the Explorer network changes after connection", async () => {
      await setupConnected("mainnet");
      getCurrentEnvMock.mockReturnValue("testT5");

      await expect(walletConnectService.invoke({ scriptHash: "h", operation: "transfer" })).rejects.toThrow(
        /WalletConnect session is on neo3:mainnet/i,
      );
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it("forwards args and signer scope to the request params", async () => {
      await setupConnected();
      mockClient.request.mockResolvedValue("0xabc");
      await walletConnectService.invoke({
        scriptHash: "0xfeed",
        operation: "method",
        args: [{ type: "Hash160", value: "x" }],
        signerScope: 16,
      });
      const params = mockClient.request.mock.calls[0][0].request.params;
      expect(params.scriptHash).toBe("0xfeed");
      expect(params.operation).toBe("method");
      expect(params.args).toEqual([{ type: "Hash160", value: "x" }]);
      expect(params.signers).toEqual([{ account: VALID_NEO_SCRIPT_HASH, scopes: 16 }]);
    });

    it("forwards explicit signer accounts after normalizing them", async () => {
      await setupConnected();
      mockClient.request.mockResolvedValue("0xabc");
      await walletConnectService.invoke({
        scriptHash: "0xfeed",
        operation: "method",
        signers: [{ account: `0x${VALID_NEO_SCRIPT_HASH}`, scopes: 128 }],
      });

      const params = mockClient.request.mock.calls[0][0].request.params;
      expect(params.signers).toEqual([{ account: VALID_NEO_SCRIPT_HASH, scopes: 128 }]);
    });

    it("rejects invokes when the session account cannot be resolved into a signer", async () => {
      await setupConnected("mainnet", "NInvalidWalletConnectAddress");
      mockClient.request.mockResolvedValue("0xabc");

      await expect(walletConnectService.invoke({ scriptHash: "h", operation: "transfer" })).rejects.toThrow(
        /valid signer account/i,
      );
      expect(mockClient.request).not.toHaveBeenCalled();
    });
  });

  describe("disconnect", () => {
    it("is a no-op when no session", () => {
      expect(() => walletConnectService.disconnect()).not.toThrow();
    });

    it("calls client.disconnect with topic and clears session", async () => {
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: ["neo3:mainnet:NAddr"] } } };
      mockClient.connect.mockResolvedValue({ uri: "u", approval: () => Promise.resolve(session) });
      await (await walletConnectService.connect()).approval;
      walletConnectService.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalledWith({
        topic: "tp",
        reason: expect.objectContaining({ code: 6000 }),
      });
      expect(walletConnectService.isConnected).toBe(false);
      expect(walletConnectService.account).toBeNull();
    });
  });

  describe("account getter", () => {
    it("returns null when no session", () => {
      expect(walletConnectService.account).toBeNull();
    });

    it("parses neo3:<chain>:<address> format", async () => {
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: ["neo3:mainnet:NA1234"] } } };
      mockClient.connect.mockResolvedValue({ uri: "u", approval: () => Promise.resolve(session) });
      await (await walletConnectService.connect()).approval;
      expect(walletConnectService.account).toEqual({ address: "NA1234", label: "WalletConnect" });
    });

    it("rejects an approved session with no neo3 accounts", async () => {
      await walletConnectService.init("p");
      const session = { topic: "tp", namespaces: { neo3: { accounts: [] } } };
      mockClient.connect.mockResolvedValue({ uri: "u", approval: () => Promise.resolve(session) });
      await expect((await walletConnectService.connect()).approval).rejects.toThrow(/no Neo N3 account/i);
      expect(walletConnectService.isConnected).toBe(false);
      expect(walletConnectService.account).toBeNull();
    });
  });
});
