import { beforeEach, describe, expect, it, vi } from "vitest";

const safeRpc = vi.fn();
const rpc = vi.fn();
const callWithRpcEndpointFallback = vi.fn();
const getCacheKey = vi.fn(() => "nns-cache-key");
const cachedRequest = vi.fn((_key, fetchFn) => fetchFn());
const getAddressTag = vi.fn();
const addressToScriptHashMock = vi.hoisted(() => vi.fn());
const scriptHashToAddressMock = vi.hoisted(() => vi.fn());
const getScriptHashFromAddress = vi.fn();
const getAddressFromScriptHash = vi.fn((value) => `N${String(value).slice(0, 10)}`);
const reverseHex = vi.fn((value) => String(value).match(/../g)?.reverse().join("") || value);
const invokeFunctionMock = vi.fn();

let currentEnv = "Mainnet";

vi.mock("../../src/services/api.js", () => ({
  safeRpc,
  rpc,
}));

vi.mock("../../src/utils/rpcEndpoints.js", () => ({
  callWithRpcEndpointFallback,
}));

vi.mock("../../src/services/cache.js", () => ({
  CACHE_TTL: { chart: 5 * 60 * 1000 },
  getCacheKey,
  cachedRequest,
}));

vi.mock("../../src/services/supabaseService.js", () => ({
  supabaseService: {
    getAddressTag,
  },
}));

vi.mock("@/utils/neoHelpers", async () => {
  const actual = await vi.importActual("@/utils/neoHelpers");
  return {
    ...actual,
    addressToScriptHash: addressToScriptHashMock,
    scriptHashToAddress: scriptHashToAddressMock,
  };
});

vi.mock("@cityofzion/neon-js", () => {
  const neonMock = {
    RpcClient: class {
      constructor() {}
      invokeFunction(...args) {
        return invokeFunctionMock(...args);
      }
    },
    ContractParam: {
      string: vi.fn(),
      integer: vi.fn(),
      byteArray: vi.fn((value) => value),
    },
    Wallet: {
      getScriptHashFromAddress,
      getAddressFromScriptHash,
    },
    reverseHex,
  };
  neonMock.rpc = { RPCClient: neonMock.RpcClient };
  neonMock.tx = { Transaction: { deserialize: vi.fn() } };
  neonMock.default = neonMock;
  return neonMock;
});

vi.mock("../../src/utils/env.js", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getCurrentEnv: () => currentEnv,
}));

describe("nnsService.resolveDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    currentEnv = "Mainnet";
    addressToScriptHashMock.mockImplementation((value) =>
      String(value || "").trim() === "NTestAddress123" ? "0xabc123" : null,
    );
    scriptHashToAddressMock.mockImplementation((value) => `N${String(value).replace(/^0x/, "").slice(0, 10)}`);
    callWithRpcEndpointFallback.mockImplementation((_env, handler) => handler("https://rpc.test"));
  });

  it("resolves .neo domains via native RPC invokeFunction", async () => {
    const domain = "flamingo.neo";
    const expectedAddress = "NNf8jxEBxsahLSiYtuHWsMFn93THdTFryw";

    callWithRpcEndpointFallback.mockResolvedValueOnce({
      state: "HALT",
      stack: [
        {
          type: "ByteString",
          value: Buffer.from(expectedAddress, "binary").toString("base64"),
        },
      ],
    });

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveDomain(domain);

    expect(callWithRpcEndpointFallback).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(expectedAddress);
  });

  it("returns null when native RPC domain resolution fails", async () => {
    const domain = "flamingo.neo";

    callWithRpcEndpointFallback.mockRejectedValueOnce(new Error("rpc failed"));

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveDomain(domain);

    expect(callWithRpcEndpointFallback).toHaveBeenCalledTimes(1);
    expect(resolved).toBeNull();
  });

  it("does not call legacy transfer RPC for .matrix reverse lookup on testnet", async () => {
    currentEnv = "TestT5";
    getAddressTag.mockResolvedValueOnce(null);
    addressToScriptHashMock.mockReturnValueOnce("0xabc123");

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveAddressToNNS("NTestAddress123");

    expect(safeRpc).not.toHaveBeenCalled();
    expect(resolved).toBeNull();
  });

  it("loads matrix domain profile from standard contract methods on testnet", async () => {
    currentEnv = "TestT5";
    const resolvedAddress = "NfK1tWc7bF9Rk2wQw9mKgU4Pj3Qe8Yz7kM";

    invokeFunctionMock
      .mockResolvedValueOnce({
        state: "HALT",
        stack: [{ type: "Boolean", value: false }],
      })
      .mockResolvedValueOnce({
        state: "HALT",
        stack: [{ type: "ByteString", value: "CqiyUBK3xeqpSEaj+XMpNpxR7xM=" }],
      })
      .mockResolvedValueOnce({
        state: "HALT",
        stack: [
          {
            type: "Map",
            value: [
              {
                key: { type: "ByteString", value: "YWRtaW4=" },
                value: { type: "ByteString", value: "CqiyUBK3xeqpSEaj+XMpNpxR7xM=" },
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        state: "HALT",
        stack: [{ type: "ByteString", value: Buffer.from(resolvedAddress, "binary").toString("base64") }],
      });

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const profile = await nnsService.getMatrixDomainProfile("alice.matrix");

    expect(callWithRpcEndpointFallback).toHaveBeenCalled();
    expect(invokeFunctionMock).toHaveBeenNthCalledWith(
      1,
      "0x89908093c5ccc463e2c5744d6bacb06108b60a75",
      "isAvailable",
      expect.any(Array),
    );
    expect(profile).toMatchObject({
      domain: "alice.matrix",
      available: false,
      owner: expect.stringMatching(/^N/),
    });
    expect(profile.admin === null || /^N/.test(profile.admin)).toBe(true);
    expect(profile.resolvedAddress === null || profile.resolvedAddress === resolvedAddress).toBe(true);
  });

  it("returns null for hash160 targets when metadata has no NNS tag", async () => {
    currentEnv = "Mainnet";
    getAddressTag.mockResolvedValueOnce(null);
    const targetHash = "0x1111111111111111111111111111111111111111";

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveAddressToNNS(targetHash);

    expect(safeRpc).not.toHaveBeenCalled();
    expect(resolved).toBeNull();
  });

  it("uses active metadata domain without legacy owner or transfer RPC probes", async () => {
    currentEnv = "Mainnet";
    getAddressTag.mockResolvedValueOnce({
      nns_domain: "betadomain.neo",
      nns_expiration_ms: Date.now() + 60_000,
    });
    addressToScriptHashMock.mockReturnValueOnce("0xabc123");

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveAddressToNNS("NTestAddress123");

    expect(safeRpc).not.toHaveBeenCalled();
    expect(resolved).toEqual({ nns: "betadomain.neo" });
  });

  it("returns null when no metadata domain exists instead of probing legacy fallbacks", async () => {
    currentEnv = "Mainnet";
    getAddressTag.mockResolvedValueOnce(null);
    addressToScriptHashMock.mockReturnValueOnce("0xabc123");

    const { default: nnsService } = await import("../../src/services/nnsService.js");
    const resolved = await nnsService.resolveAddressToNNS("NTestAddress123");

    expect(safeRpc).not.toHaveBeenCalled();
    expect(resolved).toBeNull();
  });
});
