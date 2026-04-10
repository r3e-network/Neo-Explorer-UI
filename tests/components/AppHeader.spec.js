import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const fetchPricesMock = vi.fn();
const initWalletMock = vi.fn();
const disconnectWalletMock = vi.fn();
const connectedAccountRef = { value: null };
const toast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
const walletServiceMock = {
  PROVIDERS: {
    NEOLINE: "NeoLine",
    O3: "O3",
    ONEGATE: "OneGate",
    WALLETCONNECT: "WalletConnect",
    NEON: "Neon Wallet",
    TESTNET_WIF: "Testnet WIF (Local Dev)",
    WEB3AUTH: "Google / Email (Web3Auth)",
    EVM_WALLET: "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
  },
  getAvailableProviders: vi.fn(() => []),
  getSupportedProviders: vi.fn(() => []),
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

vi.mock("@/utils/env", async () => {
  const actual = await vi.importActual("@/utils/env");
  return {
    ...actual,
    NETWORK_CHANGE_EVENT: "network-change",
    NETWORK_OPTIONS: [{ id: actual.NET_ENV.Mainnet, label: "MainNet" }],
    getCurrentEnv: () => actual.NET_ENV.Mainnet,
    getNetworkLabel: () => "MainNet",
    setCurrentEnv: (env) => env,
  };
});

vi.mock("@/utils/wallet", () => ({
  connectedAccount: connectedAccountRef,
  disconnectWallet: disconnectWalletMock,
  initWallet: initWalletMock,
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

describe("AppHeader wallet CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectedAccountRef.value = null;
    localStorage.clear();
    sessionStorage.clear();
    fetchPricesMock.mockResolvedValue({
      neo: 0,
      gas: 0,
      neoChange: 0,
      gasChange: 0,
    });
    walletServiceMock.getSupportedProviders.mockReturnValue([
      "NeoLine",
      "O3",
      "OneGate",
      "WalletConnect",
      "Neon Wallet",
      "Testnet WIF (Local Dev)",
      "Google / Email (Web3Auth)",
      "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
    ]);
    window.open = vi.fn();
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
  });

  it("shows all supported wallet options even when only some are available", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValueOnce([
      "NeoLine",
      "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
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

    expect(wrapper.text()).toContain("NeoLine");
    expect(wrapper.text()).toContain("O3");
    expect(wrapper.text()).toContain("OneGate");
    expect(wrapper.text()).toContain("WalletConnect");
    expect(wrapper.text()).toContain("Neon Wallet");
    expect(wrapper.text()).toContain("Testnet WIF (Local Dev)");
    expect(wrapper.text()).toContain("Google / Email (Web3Auth)");
    expect(wrapper.text()).toContain("EVM Wallets (MetaMask, OKX, Rabby, etc.)");
  });

  it("renders the wallet modal with a fully dark opaque backdrop and panel", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValueOnce([
      "NeoLine",
      "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
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

    const backdrop = wrapper.find('div.fixed.inset-0.z-\\[200\\]');
    expect(backdrop.exists()).toBe(true);
    expect(backdrop.attributes("class")).toContain("bg-slate-950");
    expect(backdrop.attributes("class")).not.toContain("bg-slate-950/90");

    const panel = wrapper.find('div.wallet-modal-panel');
    expect(panel.exists()).toBe(true);
    expect(panel.attributes("class")).toContain("max-w-md");
    expect(panel.attributes("class")).toContain("bg-slate-900");
    expect(panel.attributes("class")).toContain("text-slate-100");
    expect(panel.attributes("class")).not.toContain("bg-surface-base");
  });

  it("renders wallet provider rows with explicit dark readable surfaces instead of transparent bg-surface-muted classes", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValueOnce([
      "NeoLine",
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

    const providerButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Google / Email (Web3Auth)"));
    expect(providerButton).toBeTruthy();
    expect(providerButton.attributes("class")).toContain("wallet-modal-option");
    expect(providerButton.attributes("class")).toContain("bg-slate-800");
    expect(providerButton.attributes("class")).toContain("text-slate-100");
    expect(providerButton.attributes("class")).not.toContain("bg-surface-muted");
  });

  it("connects the local dev testnet WIF provider without persisting walletProvider", async () => {
    const directWif = "LtestDirectWif11111111111111111111111111111111111111111111";
    walletServiceMock.getAvailableProviders.mockReturnValueOnce([
      "Testnet WIF (Local Dev)",
      "Google / Email (Web3Auth)",
    ]);
    walletServiceMock.connect.mockResolvedValueOnce({
      address: "NTestWifAccount111111111111111111111",
      persistSession: "session",
    });

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

    const wifProviderButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Testnet WIF (Local Dev)"));
    await wifProviderButton.trigger("click");
    await flushPromises();

    const input = wrapper.find('input[type="password"]');
    await input.setValue(directWif);

    const confirmButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Connect Testnet WIF"));
    await confirmButton.trigger("click");
    await flushPromises();

    expect(walletServiceMock.connect).toHaveBeenCalledWith("Testnet WIF (Local Dev)", { wif: directWif });
    expect(localStorage.getItem("walletProvider")).toBeNull();
    expect(sessionStorage.getItem("walletProvider")).toBe("Testnet WIF (Local Dev)");
    expect(sessionStorage.getItem("devTestWif")).toBe(directWif);
  });

  it("redirects unavailable wallets to their install pages", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValueOnce([
      "NeoLine",
      "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
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

    const buttons = wrapper.findAll("button");
    const neonButton = buttons.find((candidate) => candidate.text().includes("Neon Wallet"));
    const oneGateButton = buttons.find((candidate) => candidate.text().includes("OneGate"));

    await neonButton.trigger("click");
    await oneGateButton.trigger("click");

    expect(window.open).toHaveBeenCalledWith("https://neon.coz.io/", "_blank", "noopener,noreferrer");
    expect(window.open).toHaveBeenCalledWith("https://onegate.space/", "_blank", "noopener,noreferrer");
  });

  it("uses wallet-specific icons instead of the generic Neo logo", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValueOnce(walletServiceMock.getSupportedProviders());

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
