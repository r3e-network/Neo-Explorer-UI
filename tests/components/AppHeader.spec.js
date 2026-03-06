import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const fetchPricesMock = vi.fn();
const initWalletMock = vi.fn();
const disconnectWalletMock = vi.fn();
const connectedAccountRef = { value: null };
const walletServiceMock = {
  getAvailableProviders: vi.fn(() => []),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/composables/usePriceCache", () => ({
  usePriceCache: () => ({
    fetchPrices: fetchPricesMock,
  }),
}));

vi.mock("@/utils/env", () => ({
  NETWORK_CHANGE_EVENT: "network-change",
  NETWORK_OPTIONS: [{ id: "MainNet", label: "MainNet" }],
  getCurrentEnv: () => "MainNet",
  getNetworkLabel: () => "MainNet",
  setCurrentEnv: (env) => env,
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount: connectedAccountRef,
  disconnectWallet: disconnectWalletMock,
  initWallet: initWalletMock,
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("AppHeader wallet CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectedAccountRef.value = null;
    fetchPricesMock.mockResolvedValue({
      neo: 0,
      gas: 0,
      neoChange: 0,
      gasChange: 0,
    });
  });

  it("keeps the desktop connect wallet button on one line", async () => {
    const AppHeader = (await import("@/components/layout/AppHeader.vue")).default;
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          SearchBox: true,
          UtilityBar: true,
          DesktopNav: true,
          MobileMenu: true,
          WalletConnectModal: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
        mocks: {
          $t: (value) => value,
        },
      },
    });

    await flushPromises();

    const button = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().trim() === "Connect Wallet");

    expect(button).toBeTruthy();
    expect(button.attributes("class")).toContain("shrink-0");
    expect(button.attributes("class")).toContain("whitespace-nowrap");
    expect(button.attributes("class")).toContain("min-w-[10rem]");

    wrapper.unmount();
  });

  it("shows Neon Wallet and OneGate when the provider service exposes them", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValueOnce([
      "NeoLine",
      "O3",
      "OneGate",
      "Neon Wallet",
      "WalletConnect",
      "Google / Email (Web3Auth)",
    ]);

    const AppHeader = (await import("@/components/layout/AppHeader.vue")).default;
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          SearchBox: true,
          UtilityBar: true,
          DesktopNav: true,
          MobileMenu: true,
          WalletConnectModal: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
        mocks: {
          $t: (value) => value,
        },
      },
    });

    await flushPromises();

    const connectButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().trim() === "Connect Wallet");

    await connectButton.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("OneGate");
    expect(wrapper.text()).toContain("Neon Wallet");

    wrapper.unmount();
  });

  it("uses wallet-specific icons instead of the generic Neo logo", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValueOnce([
      "NeoLine",
      "O3",
      "OneGate",
      "Neon Wallet",
      "WalletConnect",
      "Google / Email (Web3Auth)",
    ]);

    const AppHeader = (await import("@/components/layout/AppHeader.vue")).default;
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          SearchBox: true,
          UtilityBar: true,
          DesktopNav: true,
          MobileMenu: true,
          WalletConnectModal: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
        mocks: {
          $t: (value) => value,
        },
      },
    });

    await flushPromises();

    const connectButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().trim() === "Connect Wallet");

    await connectButton.trigger("click");
    await flushPromises();

    expect(wrapper.find('img[alt="NeoLine"]').attributes("src")).toBe('/img/brand/neoline.svg');
    expect(wrapper.find('img[alt="O3"]').attributes("src")).toBe('/img/brand/o3.png');
    expect(wrapper.find('img[alt="OneGate"]').attributes("src")).toBe('/img/brand/onegate.ico');
    expect(wrapper.find('img[alt="Neon Wallet"]').attributes("src")).toBe('/img/brand/neon.ico');
    expect(wrapper.find('img[alt="WalletConnect"]').attributes("src")).toBe('/img/brand/walletconnect.ico');
    expect(wrapper.find('img[alt="Web3Auth"]').attributes("src")).toBe('/img/brand/web3auth.png');
  });
});
