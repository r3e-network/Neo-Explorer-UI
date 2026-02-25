import { nextTick } from "vue";

const rpcMock = vi.hoisted(() => vi.fn());
const cachedRequestMock = vi.hoisted(() => vi.fn());
const getCurrentEnvMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api", () => ({
  rpc: rpcMock,
}));

vi.mock("@/services/cache", () => ({
  cachedRequest: cachedRequestMock,
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: getCurrentEnvMock,
  NET_ENV: { TestT5: "TestT5" },
}));

vi.mock("@cityofzion/neon-js", () => ({
  wallet: {
    Account: vi.fn().mockImplementation(() => ({ address: "NFallbackAddress" })),
  },
}));

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function flush() {
  await nextTick();
  await flushPromises();
  await nextTick();
}

describe("useCommittee", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    getCurrentEnvMock.mockReturnValue("MainNet");
    cachedRequestMock.mockResolvedValue([
      { pubkey: "PUBKEY1", name: "Consensus Node 1", scripthash: "0xcommittee1" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries committee loading after an initial RPC failure and resolves validator metadata", async () => {
    rpcMock.mockRejectedValueOnce(new Error("temporary network failure")).mockResolvedValueOnce([{ publickey: "PUBKEY1" }]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { loadCommittee, getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();

    await flush();

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(getPrimaryNodeName(0)).toBe("Loading...");
    expect(getPrimaryNodeAddress(0)).toBeNull();

    await loadCommittee();
    await flush();

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(getPrimaryNodeName(0)).toBe("Consensus Node 1");
    expect(getPrimaryNodeAddress(0)).toBe("0xcommittee1");
  });

  it("calls getnextblockvalidators with empty array params", async () => {
    rpcMock.mockResolvedValueOnce([{ publickey: "PUBKEY1" }]);

    const { useCommittee } = await import("@/composables/useCommittee");
    useCommittee();

    await flush();

    expect(rpcMock).toHaveBeenCalledWith("getnextblockvalidators", []);
  });
});
