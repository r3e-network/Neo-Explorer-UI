import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
    locale: { value: "en" },
  }),
}));

const sharedConnectedAccount = ref("");

const invokeMock = vi.fn();
const toast = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

const providerRef = ref("Google / Email (Web3Auth)");
const walletServiceMock = {
  PROVIDERS: {
    NEOLINE: "NeoLine",
    WEB3AUTH: "Google / Email (Web3Auth)",
  },
  isConnected: true,
  invoke: invokeMock,
  get provider() {
    return providerRef.value;
  },
};

class MockRpcClient {
  async getNep17Balances() {
    return { balance: [] };
  }
}

class MockAccount {
  constructor(value) {
    this.address = value;
    this.scriptHash = `0x${String(value).slice(0, 40).padEnd(40, "0")}`;
  }
}

vi.mock("@/utils/wallet", () => ({
  connectedAccount: sharedConnectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

vi.mock("@/utils/env", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getCurrentEnv: () => "Mainnet",
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  getConfiguredRpcBaseUrl: () => "",
  toAbsoluteUrl: (value) => value,
  resolveNetworkName: () => "mainnet",
}));

vi.mock("@/services/cache", () => ({
  cachedRequest: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/utils/rpcEndpoints", () => ({
  callWithRpcEndpointFallback: vi.fn(async (_env, callback) => callback("https://rpc.example")),
}));

vi.mock("@cityofzion/neon-js", () => {
  // findNeonJs requires rpc.RPCClient + tx.Transaction.deserialize.
  const Transaction = class { static deserialize() { return new Transaction(); } };
  const neonMock = {
    rpc: { RPCClient: MockRpcClient },
    tx: { Transaction },
    wallet: { Account: MockAccount },
  };
  neonMock.default = neonMock;
  return neonMock;
});

describe("SponsoredTool wallet provider handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.Neon = {
      rpc: {
        RPCClient: MockRpcClient,
      },
      wallet: {
        Account: MockAccount,
      },
    };
    sharedConnectedAccount.value = "NQJ6M4QYf9E9oKoR6fT1Y8vL2D8x4oWq8h";
    providerRef.value = "Google / Email (Web3Auth)";
    walletServiceMock.isConnected = true;
    delete window.NEOLineN3;

    global.fetch = vi.fn((url, options = {}) => {
      if (url === "/api/sponsor") {
        const body = options?.body ? JSON.parse(options.body) : {};
        if (body.action === "info") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ sponsorAddress: "Nff6xLFw4QzQmMKhj5wqj9f7j8Ue8q4yrS" }),
          });
        }
        if (body.action === "sign") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ txid: "0xabc123" }),
          });
        }
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });

    invokeMock.mockResolvedValue({ signedTx: "deadbeef" });
  });

  it("does not require NeoLine global when active provider is Web3Auth", async () => {
    const SponsoredTool = (await import("@/views/Tools/SponsoredTool.vue")).default;
    const wrapper = mount(SponsoredTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
        mocks: {
          $t: (key, params) => {
            const messages = {
              "nav.home": "Home",
              "tools.title": "Tools",
              "tools.sponsored.title": "Sponsored Transactions",
              "tools.sponsored.subtitle":
                "Claim GAS or vote without paying network fees. Only available if your GAS balance is insufficient.",
              "tools.sponsored.howItWorksTitle": "How it works",
              "tools.sponsored.howItWorksDescription": "This tool allows you to perform essential network actions.",
              "tools.sponsored.walletNotConnected": "Wallet Not Connected",
              "tools.sponsored.walletNotConnectedDescription":
                "Please connect your wallet from the header to use sponsored transactions.",
              "tools.sponsored.gasBalance": "Your GAS Balance",
              "tools.sponsored.eligibilityStatus": "Eligibility Status",
              "tools.sponsored.eligible": "Eligible",
              "tools.sponsored.notEligible": "Not Eligible",
              "tools.sponsored.eligibilityThreshold": `Requires < ${params?.threshold ?? ""} GAS`,
              "tools.sponsored.selectOperation": "Select Operation",
              "tools.sponsored.claimGas": "Claim GAS",
              "tools.sponsored.claimGasDescription": "Transfers 0 NEO to yourself to mint accumulated GAS rewards.",
              "tools.sponsored.voteCandidate": "Vote for Candidate",
              "tools.sponsored.voteDescription": "Cast your NEO voting weight for a consensus node candidate.",
              "tools.sponsored.selectCandidate": "Select Candidate",
              "tools.sponsored.selectCandidatePlaceholder": "-- Select a consensus node candidate --",
              "tools.sponsored.loadingCandidates": "Loading candidates...",
              "tools.sponsored.executeButton": "Execute Sponsored Transaction",
              "tools.sponsored.processing": "Processing...",
              "tools.sponsored.txSuccess": "Transaction Broadcasted Successfully!",
              "tools.sponsored.viewTx": "View Tx",
            };
            return messages[key] || key;
          },
        },
      },
    });

    await flushPromises();

    const executeButton = wrapper.findAll("button").find((btn) => btn.text().includes("Execute Sponsored Transaction"));
    expect(executeButton).toBeTruthy();

    await executeButton.trigger("click");
    await flushPromises();

    expect(toast.error).not.toHaveBeenCalledWith("NeoLine N3 wallet not found.");
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  // Audit finding #3: if the backend's action:info response omits sponsorAddress
  // (misconfigured backend), the flow MUST fail fast BEFORE prompting the wallet.
  // Otherwise createAccount(undefined) derives a random signer[0] and the relay
  // rejects with "First signer must be the sponsor account" — after the user has
  // already signed a real transaction.
  it("throws a config error BEFORE the wallet prompt when sponsorAddress is absent", async () => {
    global.fetch = vi.fn((url, options = {}) => {
      if (url === "/api/sponsor") {
        const body = options?.body ? JSON.parse(options.body) : {};
        if (body.action === "info") {
          // The pre-fix backend default: enabled but no address exposed.
          return Promise.resolve({ ok: true, json: async () => ({ sponsorEnabled: true }) });
        }
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const SponsoredTool = (await import("@/views/Tools/SponsoredTool.vue")).default;
    const wrapper = mount(SponsoredTool, {
      global: {
        stubs: { Breadcrumb: true, RouterLink: true },
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();

    const executeButton = wrapper.findAll("button").find((btn) => btn.text().includes("tools.sponsored.executeButton"));
    expect(executeButton).toBeTruthy();

    await executeButton.trigger("click");
    await flushPromises();

    // Never prompted the wallet: no signature was wasted on a doomed relay.
    expect(invokeMock).not.toHaveBeenCalled();
    // Surfaced the config error to the user.
    expect(toast.error).toHaveBeenCalled();
  });
});
