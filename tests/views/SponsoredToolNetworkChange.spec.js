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

vi.mock("@cityofzion/neon-js", () => ({
  rpc: { RPCClient: MockRpcClient },
  wallet: { Account: class { constructor(value) { this.address = value; this.scriptHash = `0x${String(value).slice(0, 40).padEnd(40, "0")}`; } } },
}));

describe("SponsoredTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedConnectedAccount.value = "NQJ6M4QYf9E9oKoR6fT1Y8vL2D8x4oWq8h";
    envState.value = "Mainnet";
    callWithRpcEndpointFallbackMock.mockResolvedValue({ balance: [] });
    cachedRequestMock.mockResolvedValue([
      { pubkey: "PUBKEY1", name: "Candidate One", votes: 100 },
    ]);
  });

  it("clears mainnet-only candidate choices after switching to testnet", async () => {
    const SponsoredTool = (await import("@/views/Tools/SponsoredTool.vue")).default;
    const wrapper = mount(SponsoredTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
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
