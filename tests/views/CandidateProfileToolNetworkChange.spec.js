import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const candidateGetByAddressMock = vi.fn();
const cachedRequestMock = vi.fn();
const getCurrentEnvMock = vi.fn();
const walletServiceMock = {
  isConnected: false,
  signMessage: vi.fn(),
};

const sharedConnectedAccount = ref("");

vi.mock("@/utils/wallet", () => ({
  connectedAccount: sharedConnectedAccount,
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
}));

vi.mock("@/services/candidateService", () => ({
  default: {
    getByAddress: candidateGetByAddressMock,
  },
}));

vi.mock("@/services/cache", () => ({
  cachedRequest: cachedRequestMock,
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: getCurrentEnvMock,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  NET_ENV: { Mainnet: "Mainnet", TestT5: "TestNet" },
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
  default: walletServiceMock,
}));

describe("CandidateProfileTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedConnectedAccount.value = "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf";
    getCurrentEnvMock.mockReturnValue("Mainnet");
    candidateGetByAddressMock.mockResolvedValue({ candidate: true, publickey: "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b" });
    cachedRequestMock.mockResolvedValue([
      {
        pubkey: "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b",
        name: "The Neo Order",
      },
    ]);
  });

  it("reloads the connected candidate profile when the explorer network changes", async () => {
    const CandidateProfileTool = (await import("@/views/Tools/CandidateProfileTool.vue")).default;
    const wrapper = mount(CandidateProfileTool, {
      global: {
        stubs: {
          Breadcrumb: true,
        },
      },
    });

    await flushPromises();
    await flushPromises();
    expect(wrapper.get('input[placeholder="e.g. My Neo Node"]').element.value).toBe("The Neo Order");

    getCurrentEnvMock.mockReturnValue("TestNet");
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestNet" } }));
    await flushPromises();
    await flushPromises();

    expect(candidateGetByAddressMock).toHaveBeenCalledTimes(2);
    expect(wrapper.get('input[placeholder="e.g. My Neo Node"]').element.value).toBe("");
    wrapper.unmount();
  });
});
