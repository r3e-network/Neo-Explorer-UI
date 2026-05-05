const { neonJsDefaultMock, neonJsNamespaceMock } = vi.hoisted(() => ({
  neonJsDefaultMock: {
    tx: { Transaction: { deserialize: vi.fn() } },
    rpc: { RPCClient: class {} },
  },
  neonJsNamespaceMock: {
    tx: { Transaction: { deserialize: vi.fn() } },
    rpc: { RPCClient: class {} },
  },
}));

vi.mock("@cityofzion/neon-js", () => ({
  default: neonJsDefaultMock,
  ...neonJsNamespaceMock,
}));

let loadNeonJs;
let getNeonJsSync;

describe("neonLoader", () => {
  beforeEach(async () => {
    vi.resetModules();
    delete globalThis.window;
    const mod = await import("@/utils/neonLoader");
    loadNeonJs = mod.loadNeonJs;
    getNeonJsSync = mod.getNeonJsSync;
  });

  describe("loadNeonJs", () => {
    it("resolves the bundled neon-js when window.Neon is unset", async () => {
      const result = await loadNeonJs();
      expect(result).toBeTruthy();
      expect(result.tx.Transaction).toBeDefined();
      expect(result.rpc.RPCClient).toBeDefined();
    });

    it("prefers window.Neon when available with full API", async () => {
      globalThis.window = {
        Neon: {
          tx: { Transaction: { deserialize: vi.fn() } },
          rpc: { RPCClient: class WindowRPC {} },
        },
      };
      // Re-import to get the module re-evaluated against the new window
      vi.resetModules();
      const mod = await import("@/utils/neonLoader");
      const result = await mod.loadNeonJs();
      expect(result).toBe(globalThis.window.Neon);
    });

    it("falls back to bundled neon-js when window.Neon is incomplete", async () => {
      globalThis.window = { Neon: { foo: "incomplete" } };
      vi.resetModules();
      const mod = await import("@/utils/neonLoader");
      const result = await mod.loadNeonJs();
      // Should NOT be the broken window.Neon
      expect(result).not.toBe(globalThis.window.Neon);
      expect(result?.tx?.Transaction).toBeDefined();
    });
  });

  describe("getNeonJsSync", () => {
    it("returns the same resolved instance synchronously", () => {
      const result = getNeonJsSync();
      expect(result).toBeTruthy();
      expect(result.tx.Transaction).toBeDefined();
    });

    it("prefers window.Neon synchronously when present and valid", async () => {
      globalThis.window = {
        Neon: {
          tx: { Transaction: { deserialize: vi.fn() } },
          rpc: { RPCClient: class {} },
        },
      };
      vi.resetModules();
      const mod = await import("@/utils/neonLoader");
      const result = mod.getNeonJsSync();
      expect(result).toBe(globalThis.window.Neon);
    });
  });
});
