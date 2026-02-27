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
  NET_ENV: { Mainnet: "Mainnet", TestT5: "TestNet" },
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
  default: walletServiceMock,
}));

describe("CandidateProfileTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedConnectedAccount.value = "";
    getCurrentEnvMock.mockReturnValue("Mainnet");
  });

  it("prefills candidate profile form from existing Dora metadata after wallet connect", async () => {
    const account = "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf";
    const pubkey = "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b";

    sharedConnectedAccount.value = account;
    candidateGetByAddressMock.mockResolvedValue({ candidate: true, publickey: pubkey });
    cachedRequestMock.mockResolvedValue([
      {
        pubkey,
        name: "The Neo Order",
        location: "Shanghai",
        website: "https://neoorder.io",
        description: "Profile description",
        twitter: "neo_order",
        github: "https://github.com/neoorder",
        telegram: "t.me/neoorder",
        logo: "https://example.com/logo.png",
      },
    ]);

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

    expect(candidateGetByAddressMock).toHaveBeenCalled();
    expect(cachedRequestMock).toHaveBeenCalled();
    expect(wrapper.get('input[placeholder="03..."]').element.value).toBe(pubkey);
    expect(wrapper.get('input[placeholder="e.g. My Neo Node"]').element.value).toBe("The Neo Order");
    expect(wrapper.get('input[placeholder="e.g. Zurich, Switzerland"]').element.value).toBe("Shanghai");
    expect(wrapper.get('input[placeholder="https://..."]').element.value).toBe("https://neoorder.io");
    expect(wrapper.get('textarea[placeholder*="Brief description"]').element.value).toBe("Profile description");
    expect(wrapper.get('input[placeholder="username"]').element.value).toBe("neo_order");
    expect(wrapper.get('input[placeholder="https://github.com/..."]').element.value).toBe("https://github.com/neoorder");
    expect(wrapper.get('input[placeholder="t.me/..."]').element.value).toBe("t.me/neoorder");
    expect(wrapper.get('input[placeholder="neofs://..."]').element.value).toBe("https://example.com/logo.png");
  });

  it("keeps profile fields blank when valid candidate has no existing Dora metadata", async () => {
    const account = "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf";
    const pubkey = "03d9e8b16bd9b22d3345d6d4cde31be1c3e1d161532e3d0ccecb95ece2eb58336e";

    sharedConnectedAccount.value = account;
    candidateGetByAddressMock.mockResolvedValue({ candidate: true, publickey: pubkey });
    cachedRequestMock.mockResolvedValue([]);

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

    expect(wrapper.get('input[placeholder="03..."]').element.value).toBe(pubkey);
    expect(wrapper.get('input[placeholder="e.g. My Neo Node"]').element.value).toBe("");
    expect(wrapper.get('input[placeholder="e.g. Zurich, Switzerland"]').element.value).toBe("");
    expect(wrapper.get('input[placeholder="https://..."]').element.value).toBe("");
    expect(wrapper.get('textarea[placeholder*="Brief description"]').element.value).toBe("");
    expect(wrapper.get('input[placeholder="username"]').element.value).toBe("");
    expect(wrapper.get('input[placeholder="https://github.com/..."]').element.value).toBe("");
    expect(wrapper.get('input[placeholder="t.me/..."]').element.value).toBe("");
    expect(wrapper.get('input[placeholder="neofs://..."]').element.value).toBe("");
  });
});
