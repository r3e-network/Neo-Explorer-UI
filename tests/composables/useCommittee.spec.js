import { nextTick } from "vue";

const rpcMock = vi.hoisted(() => vi.fn());
const cachedRequestMock = vi.hoisted(() => vi.fn());
const getCurrentEnvMock = vi.hoisted(() => vi.fn());
const walletAccountMock = vi.hoisted(() => vi.fn());
const getValidatorMetadataMock = vi.hoisted(() => vi.fn());

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

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getValidatorMetadata: getValidatorMetadataMock,
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
    getValidatorMetadataMock.mockResolvedValue([]);
    cachedRequestMock.mockResolvedValue([
      { pubkey: "PUBKEY1", name: "Consensus Node 1", scripthash: "0xcommittee1" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to GetCommittee when getnextblockvalidators fails", async () => {
    rpcMock.mockRejectedValueOnce(new Error("temporary network failure")).mockResolvedValueOnce([{ publickey: "PUBKEY1" }]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();

    await flush();

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenNthCalledWith(1, "getnextblockvalidators", []);
    expect(rpcMock).toHaveBeenNthCalledWith(2, "GetCommittee", { Limit: 21, Skip: 0 });
    expect(getPrimaryNodeName(0)).toBe("Consensus Node 1");
    expect(getPrimaryNodeAddress(0)).toBe("0xcommittee1");
  });

  it("calls getnextblockvalidators for primary-index validator mapping", async () => {
    rpcMock.mockResolvedValueOnce([{ publickey: "PUBKEY1" }]);

    const { useCommittee } = await import("@/composables/useCommittee");
    useCommittee();

    await flush();

    expect(rpcMock).toHaveBeenCalledWith("getnextblockvalidators", []);
    expect(rpcMock).not.toHaveBeenCalledWith("GetCommittee", { Limit: 21, Skip: 0 });
  });

  it("maps primary index against next block validators instead of committee order", async () => {
    walletAccountMock.mockImplementation(function (publickey) {
      this.address = publickey === "PUBKEY_VALIDATOR_0"
        ? "NValidatorZeroAddress"
        : publickey === "PUBKEY_VALIDATOR_1"
          ? "NValidatorOneAddress"
          : "NCommitteeAddress";
    });
    rpcMock.mockImplementation(async (method) => {
      if (method === "getnextblockvalidators") {
        return [{ publickey: "PUBKEY_VALIDATOR_0" }, { publickey: "PUBKEY_VALIDATOR_1" }];
      }
      if (method === "GetCommittee") {
        return [{ publickey: "PUBKEY_COMMITTEE_0" }, { publickey: "PUBKEY_COMMITTEE_1" }];
      }
      return [];
    });
    cachedRequestMock.mockResolvedValueOnce([
      {
        pubkey: "PUBKEY_VALIDATOR_0",
        name: "Validator Zero",
        scripthash: "0x0000000000000000000000000000000000000000",
      },
      {
        pubkey: "PUBKEY_VALIDATOR_1",
        name: "Validator One",
        scripthash: "0x0000000000000000000000000000000000000001",
      },
    ]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName } = useCommittee();

    await flush();

    expect(getPrimaryNodeName(1)).toBe("Validator One");
  });

  it("prefers top-7 candidate order from metadata for primary mapping", async () => {
    rpcMock.mockResolvedValueOnce([
      { publickey: "RPC_0" },
      { publickey: "RPC_1" },
      { publickey: "RPC_2" },
      { publickey: "RPC_3" },
      { publickey: "RPC_4" },
      { publickey: "RPC_5" },
      { publickey: "RPC_6" },
    ]);
    cachedRequestMock.mockResolvedValueOnce([
      { pubkey: "DORA_0", name: "Dora Zero", scripthash: "0x0000000000000000000000000000000000000010", votes: 700 },
      { pubkey: "DORA_1", name: "Dora One", scripthash: "0x0000000000000000000000000000000000000011", votes: 600 },
      { pubkey: "DORA_2", name: "Dora Two", scripthash: "0x0000000000000000000000000000000000000012", votes: 500 },
      { pubkey: "DORA_3", name: "Dora Three", scripthash: "0x0000000000000000000000000000000000000013", votes: 400 },
      { pubkey: "DORA_4", name: "Dora Four", scripthash: "0x0000000000000000000000000000000000000014", votes: 300 },
      { pubkey: "DORA_5", name: "Dora Five", scripthash: "0x0000000000000000000000000000000000000015", votes: 200 },
      { pubkey: "DORA_6", name: "Dora Six", scripthash: "0x0000000000000000000000000000000000000016", votes: 100 },
    ]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();

    await flush();

    expect(getPrimaryNodeName(1)).toBe("Dora One");
    expect(getPrimaryNodeAddress(1)).toBe("0x0000000000000000000000000000000000000011");
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

  it("resolves committee entries returned as candidate script hashes", async () => {
    rpcMock.mockResolvedValueOnce({
      result: [{ candidate: "0xa62eb3c767ef3d39d98c704f70fc4e869349a6fd" }],
    });
    cachedRequestMock.mockResolvedValueOnce([
      {
        pubkey: "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b",
        name: "The Neo Order",
        scripthash: "0xa62eb3c767ef3d39d98c704f70fc4e869349a6fd",
      },
    ]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();

    await flush();

    expect(getPrimaryNodeName(0)).toBe("The Neo Order");
    expect(getPrimaryNodeAddress(0)).toBe("0xa62eb3c767ef3d39d98c704f70fc4e869349a6fd");
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

  it("does not block Dora validator metadata mapping when validator RPC is hanging", async () => {
    rpcMock.mockImplementationOnce(() => new Promise(() => {}));
    cachedRequestMock.mockResolvedValueOnce([
      { pubkey: "FAST_0", name: "Dora Fast 0", scripthash: "0x0000000000000000000000000000000000000110", votes: 700 },
      { pubkey: "FAST_1", name: "Dora Fast 1", scripthash: "0x0000000000000000000000000000000000000111", votes: 600 },
      { pubkey: "FAST_2", name: "Dora Fast 2", scripthash: "0x0000000000000000000000000000000000000112", votes: 500 },
      { pubkey: "FAST_3", name: "Dora Fast 3", scripthash: "0x0000000000000000000000000000000000000113", votes: 400 },
      { pubkey: "FAST_4", name: "Dora Fast 4", scripthash: "0x0000000000000000000000000000000000000114", votes: 300 },
      { pubkey: "FAST_5", name: "Dora Fast 5", scripthash: "0x0000000000000000000000000000000000000115", votes: 200 },
      { pubkey: "FAST_6", name: "Dora Fast 6", scripthash: "0x0000000000000000000000000000000000000116", votes: 100 },
    ]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName, getPrimaryNodeAddress } = useCommittee();

    await flush();

    expect(getPrimaryNodeName(0)).toBe("Dora Fast 0");
    expect(getPrimaryNodeAddress(0)).toBe("0x0000000000000000000000000000000000000110");
  });

  it("prefers indexer validator metadata cache before Dora fallback", async () => {
    rpcMock.mockResolvedValueOnce([{ publickey: "IDX_0" }]);
    getValidatorMetadataMock.mockResolvedValueOnce([
      {
        public_key: "IDX_0",
        display_name: "Indexer Node 0",
        address: "0x0000000000000000000000000000000000000220",
        votes: "700",
        rank: 1,
        logo_url: "https://example.com/indexer-node.png",
      },
      {
        public_key: "IDX_1",
        display_name: "Indexer Node 1",
        address: "0x0000000000000000000000000000000000000221",
        votes: "600",
        rank: 2,
      },
      {
        public_key: "IDX_2",
        display_name: "Indexer Node 2",
        address: "0x0000000000000000000000000000000000000222",
        votes: "500",
        rank: 3,
      },
      {
        public_key: "IDX_3",
        display_name: "Indexer Node 3",
        address: "0x0000000000000000000000000000000000000223",
        votes: "400",
        rank: 4,
      },
      {
        public_key: "IDX_4",
        display_name: "Indexer Node 4",
        address: "0x0000000000000000000000000000000000000224",
        votes: "300",
        rank: 5,
      },
      {
        public_key: "IDX_5",
        display_name: "Indexer Node 5",
        address: "0x0000000000000000000000000000000000000225",
        votes: "200",
        rank: 6,
      },
      {
        public_key: "IDX_6",
        display_name: "Indexer Node 6",
        address: "0x0000000000000000000000000000000000000226",
        votes: "100",
        rank: 7,
      },
    ]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeName, getPrimaryNodeAddress, getPrimaryNodeLogo } = useCommittee();

    await flush();

    expect(getPrimaryNodeName(0)).toBe("Indexer Node 0");
    expect(getPrimaryNodeAddress(0)).toBe("0x0000000000000000000000000000000000000220");
    expect(getPrimaryNodeLogo(0)).toBe("https://example.com/indexer-node.png");
    expect(cachedRequestMock).not.toHaveBeenCalled();
  });

  it("keeps pre-proxied validator logo urls unchanged", async () => {
    rpcMock.mockResolvedValueOnce([{ publickey: "IDX_PROXY_0" }]);
    getValidatorMetadataMock.mockResolvedValueOnce([
      {
        public_key: "IDX_PROXY_0",
        display_name: "Indexer Proxy Node",
        address: "0x0000000000000000000000000000000000000330",
        logo_url:
          "/api/logo?u=https%3A%2F%2Fgovernance.neo.org%2Flogo%2Fidx_proxy.png&w=64&q=72&fit=contain",
      },
    ]);

    const { useCommittee } = await import("@/composables/useCommittee");
    const { getPrimaryNodeLogo } = useCommittee();

    await flush();

    expect(getPrimaryNodeLogo(0)).toBe(
      "/api/logo?u=https%3A%2F%2Fgovernance.neo.org%2Flogo%2Fidx_proxy.png&w=64&q=72&fit=contain"
    );
  });
});
