import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

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
  getCurrentEnv: () => "Mainnet",
}));

vi.mock("@/services/cache", () => ({
  cachedRequest: vi.fn().mockResolvedValue([]),
}));

vi.mock("@cityofzion/neon-js", () => ({
  rpc: { RPCClient: MockRpcClient },
  wallet: { Account: MockAccount },
}));

describe("SponsoredTool wallet provider handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
