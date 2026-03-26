import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const sharedConnectedAccount = ref("");
const envState = { value: "Mainnet" };
const cachedRequestMock = vi.fn();
const callWithRpcEndpointFallbackMock = vi.fn();

const toast = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

const walletServiceMock = {
  PROVIDERS: {
    NEOLINE: "NeoLine",
    WEB3AUTH: "Google / Email (Web3Auth)",
  },
  isConnected: true,
  invoke: vi.fn(),
  provider: "Google / Email (Web3Auth)",
};

class MockRpcClient {
  async getNep17Balances() {
    return { balance: [] };
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
  getCurrentEnv: () => envState.value,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  getConfiguredRpcBaseUrl: () => "",
  toAbsoluteUrl: (value) => value,
}));

vi.mock("@/services/cache", () => ({
  cachedRequest: cachedRequestMock,
}));

vi.mock("@/utils/rpcEndpoints", () => ({
  callWithRpcEndpointFallback: callWithRpcEndpointFallbackMock,
}));

vi.mock("@r3e/neo-js-sdk", () => ({
  RpcClient: MockRpcClient,
  Account: class {
    constructor(value) {
      this.address = value;
      this.scriptHash = `0x${String(value).slice(0, 40).padEnd(40, "0")}`;
    }
  },
}));

describe("SponsoredTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedConnectedAccount.value = "NQJ6M4QYf9E9oKoR6fT1Y8vL2D8x4oWq8h";
    envState.value = "Mainnet";
    callWithRpcEndpointFallbackMock.mockResolvedValue({ balance: [] });
    cachedRequestMock.mockResolvedValue([{ pubkey: "PUBKEY1", name: "Candidate One", votes: 100 }]);
  });

  it("clears mainnet-only candidate choices after switching to testnet", async () => {
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

    const voteButton = wrapper.findAll("button").find((btn) => btn.text().includes("Vote for Candidate"));
    await voteButton.trigger("click");
    await flushPromises();

    expect(wrapper.html()).toContain("Candidate One");

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(wrapper.html()).not.toContain("Candidate One");
    wrapper.unmount();
  });
});
