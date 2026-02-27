import { nextTick } from "vue";

const rpcMock = vi.hoisted(() => vi.fn());
const cachedRequestMock = vi.hoisted(() => vi.fn());
const getCurrentEnvMock = vi.hoisted(() => vi.fn());
const walletAccountMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/api", () => ({
  rpc: rpcMock,
}));

vi.mock("@/services/cache", () => ({
  cachedRequest: cachedRequestMock,
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: getCurrentEnvMock,
  NET_ENV: { TestT5: "TestT5" },
  NETWORK_CHANGE_EVENT: "neo:network-change",
}));

vi.mock("@cityofzion/neon-js", () => ({
  wallet: {
    Account: walletAccountMock,
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
    walletAccountMock.mockImplementation(function () {
      this.address = "NFallbackAddress";
    });
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
    expect(getPrimaryNodeName(0)).toBe("Consensus Node 1");
    expect(getPrimaryNodeAddress(0)).toBeNull();

    await loadCommittee();
    await flush();

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(getPrimaryNodeName(0)).toBe("Consensus Node 1");
    expect(getPrimaryNodeAddress(0)).toBe("0xcommittee1");
  });

  it("calls GetCommittee with pagination params", async () => {
    rpcMock.mockResolvedValueOnce([{ publickey: "PUBKEY1" }]);

    const { useCommittee } = await import("@/composables/useCommittee");
    useCommittee();

    await flush();

    expect(rpcMock).toHaveBeenCalledWith("GetCommittee", { Limit: 21, Skip: 0 });
  });

  it("normalizes string committee entries so validator metadata resolves", async () => {
    rpcMock.mockResolvedValueOnce(["PUBKEY1"]);
    cachedRequestMock.mockResolvedValueOnce([
      {
        pubkey: "PUBKEY1",
        name: "Validator Alpha",
        scripthash: "0x1234567890abcdef1234567890abcdef12345678",
      },
    ]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();

    await flush();

    expect(getPrimaryNodeName(0)).toBe("Validator Alpha");
    expect(getPrimaryNodeAddress(0)).toBe("0x1234567890abcdef1234567890abcdef12345678");
  });

  it("falls back to known-address validator name when Dora metadata is missing", async () => {
    rpcMock.mockResolvedValueOnce([{ publickey: "PUBKEY1" }]);
    cachedRequestMock.mockResolvedValueOnce([]);
    walletAccountMock.mockImplementation(function () {
      this.address = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
    });

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();

    await flush();

    expect(getPrimaryNodeName(0)).toBe("COZ");
    expect(getPrimaryNodeAddress(0)).toBe("NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w");
  });

  it("falls back to deterministic consensus-node label when no metadata is available", async () => {
    rpcMock.mockResolvedValueOnce([{ publickey: "PUBKEY1" }]);
    cachedRequestMock.mockResolvedValueOnce([]);
    walletAccountMock.mockImplementation(function () {
      this.address = "NNoMetadataFallbackAddress";
    });

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName } = useCommittee();

    await flush();

    expect(getPrimaryNodeName(0)).toBe("Consensus Node 1");
  });
});
