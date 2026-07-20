import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

enableAutoUnmount(afterEach);

vi.mock("vue-i18n", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useI18n: () => ({
      t: (key, params = {}) => {
        if (key === "header.walletIssue") return `${key}:${params.provider || ""}`;
        if (key === "header.walletIssueAria") return `${key}:${params.provider || ""}:${params.error || ""}`;
        return key;
      },
    }),
  };
});

const pushMock = vi.fn();
const routeMock = vi.hoisted(() => ({ fullPath: "/homepage", path: "/homepage", params: {}, query: {} }));
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
  cancelPendingConnection: vi.fn(),
  ensureNetworkConsistency: vi.fn(),
};

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useRoute: () => routeMock,
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
  beforeEach(async () => {
    vi.clearAllMocks();
    connectedAccountRef.value = null;
    const walletState = await import("@/utils/walletState");
    walletState.connectedWalletProvider.value = "";
    walletState.connectedWalletAccount.value = null;
    walletState.walletNetworkError.value = "";
    localStorage.clear();
    sessionStorage.clear();
    routeMock.fullPath = "/homepage";
    routeMock.path = "/homepage";
    routeMock.params = {};
    routeMock.query = {};
    fetchPricesMock.mockResolvedValue({
      neo: 0,
      gas: 0,
      neoChange: 0,
      gasChange: 0,
    });
    walletServiceMock.getSupportedProviders.mockReturnValue([
      "NeoLine",
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");

    expect(button).toBeTruthy();
    expect(button.attributes("class")).toContain("shrink-0");
    expect(button.attributes("class")).toContain("whitespace-nowrap");
    expect(button.attributes("class")).toContain("min-w-[10rem]");
  });

  it("uses the official Neo X brand on Neo X routes", async () => {
    routeMock.fullPath = "/x";
    routeMock.path = "/x";

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

    const logo = wrapper.find('img[alt="Neo X logo"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("/img/brand/neox-mark.svg");
    expect(wrapper.text()).toContain("Neo X Explorer");
  });

  it("updates the Neo X network label while price loading is still pending", async () => {
    routeMock.fullPath = "/x";
    routeMock.path = "/x";
    fetchPricesMock.mockReturnValueOnce(new Promise(() => {}));

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

    window.dispatchEvent(new CustomEvent("network-change", { detail: { neoxNet: "neox-testnet" } }));
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "UtilityBar" }).props("currentNetworkLabel")).toBe("Neo X Testnet");
  });

  it("shows all supported wallet options even when only some are available", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValue([
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");

    await connectButton.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("NeoLine");
    expect(wrapper.text()).toContain("OneGate");
    expect(wrapper.text()).toContain("WalletConnect");
    expect(wrapper.text()).toContain("Neon Wallet");
    expect(wrapper.text()).toContain("Testnet WIF (Local Dev)");
    expect(wrapper.text()).toContain("Google / Email (Web3Auth)");
    expect(wrapper.text()).toContain("EVM Wallets (MetaMask, OKX, Rabby, etc.)");
  });

  it("renders the wallet modal as a dark floating panel without a fullscreen backdrop tint", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValue([
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");

    await connectButton.trigger("click");
    await flushPromises();

    const backdrop = wrapper.find('div.fixed.inset-0.z-\\[200\\]');
    expect(backdrop.exists()).toBe(true);
    expect(backdrop.attributes("class")).toContain("bg-transparent");
    expect(backdrop.attributes("class")).not.toContain("bg-slate-950");

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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");

    await connectButton.trigger("click");
    await flushPromises();

    const providerButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Google / Email (Web3Auth)"));
    expect(providerButton).toBeTruthy();
    expect(providerButton.attributes("class")).toContain("wallet-modal-option");
    expect(providerButton.attributes("class")).toContain("bg-slate-800");
    expect(providerButton.attributes("class")).toContain("text-slate-100");
    expect(providerButton.attributes("class")).not.toContain("bg-surface-muted");

    const iconShell = wrapper.findAll("div.wallet-modal-icon-shell").at(0);
    expect(iconShell.exists()).toBe(true);
    expect(iconShell.attributes("class")).toContain("bg-white");
    expect(iconShell.attributes("class")).not.toContain("bg-slate-950");

    const neoLineLogo = wrapper.find('img[alt="NeoLine"]');
    expect(neoLineLogo.attributes("class")).toContain("wallet-modal-logo-wordmark");
    expect(neoLineLogo.attributes("class")).toContain("object-cover");
    expect(neoLineLogo.attributes("class")).toContain("object-left");
    expect(neoLineLogo.attributes("class")).toContain("w-5");
    expect(neoLineLogo.attributes("class")).toContain("h-5");
    expect(neoLineLogo.attributes("class")).not.toContain("h-full");
    expect(neoLineLogo.attributes("class")).not.toContain("w-auto");
    expect(iconShell.attributes("class")).not.toContain("wallet-modal-icon-shell--wordmark");
  });

  it("lets walletService own local dev testnet WIF persistence", async () => {
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");
    await connectButton.trigger("click");
    await flushPromises();

    const wifProviderButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Testnet WIF (Local Dev)"));
    await wifProviderButton.trigger("click");
    await flushPromises();

    const input = wrapper.find('input[type="password"]');
    await input.setValue(directWif);

    const confirmButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("header.connectTestnetWif"));
    await confirmButton.trigger("click");
    await flushPromises();

    expect(walletServiceMock.connect).toHaveBeenCalledWith("Testnet WIF (Local Dev)", { wif: directWif });
    expect(localStorage.getItem("connectedWallet")).toBeNull();
    expect(localStorage.getItem("walletProvider")).toBeNull();
    expect(sessionStorage.getItem("connectedWallet")).toBeNull();
    expect(sessionStorage.getItem("walletProvider")).toBeNull();
    expect(sessionStorage.getItem("devTestWif")).toBeNull();
  });

  it("redirects unavailable installable wallets while keeping config-gated wallets in-app", async () => {
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");

    await connectButton.trigger("click");
    await flushPromises();

    let buttons = wrapper.findAll("button");
    const walletConnectButton = buttons.find((candidate) => candidate.text().includes("WalletConnect"));
    const neonButton = buttons.find((candidate) => candidate.text().includes("Neon Wallet"));

    await walletConnectButton.trigger("click");
    await flushPromises();
    await neonButton.trigger("click");
    await flushPromises();

    buttons = wrapper.findAll("button");
    const oneGateButton = buttons.find((candidate) => candidate.text().includes("OneGate"));
    await oneGateButton.trigger("click");
    await flushPromises();

    expect(window.open).not.toHaveBeenCalledWith("https://walletconnect.network/", "_blank", "noopener,noreferrer");
    expect(window.open).not.toHaveBeenCalledWith("https://neon.coz.io/", "_blank", "noopener,noreferrer");
    expect(window.open).toHaveBeenCalledWith("https://onegate.space/", "_blank", "noopener,noreferrer");
    expect(toast.info).toHaveBeenCalledWith("header.providerWalletConnect");
    expect(toast.info).toHaveBeenCalledWith("header.providerNeon");
  });

  it("shows an immediate wallet approval hint for external wallet prompts", async () => {
    walletServiceMock.getAvailableProviders.mockReturnValue([
      "NeoLine",
    ]);
    walletServiceMock.connect.mockResolvedValueOnce({
      address: "NNeoLineConnected111111111111111111",
      label: "NeoLine",
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");
    await connectButton.trigger("click");
    await flushPromises();

    const neoLineButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("NeoLine"));
    await neoLineButton.trigger("click");
    await flushPromises();

    expect(walletServiceMock.connect).toHaveBeenCalledWith("NeoLine");
    expect(toast.info).toHaveBeenCalledWith("header.waitingForWalletApproval");
    expect(toast.success).toHaveBeenCalledWith("header.connectedAs");
  });

  it("refreshes provider availability before connecting a wallet that became available", async () => {
    walletServiceMock.getAvailableProviders
      .mockReturnValueOnce(["NeoLine"])
      .mockReturnValueOnce(["OneGate"]);
    walletServiceMock.connect.mockResolvedValueOnce({
      address: "NOneGateAvailableAfterInstall111111111",
      label: "OneGate",
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");
    await connectButton.trigger("click");
    await flushPromises();

    const oneGateButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("OneGate"));
    expect(oneGateButton.text()).toContain("header.providerOneGate");

    await oneGateButton.trigger("click");
    await flushPromises();

    expect(window.open).not.toHaveBeenCalled();
    expect(walletServiceMock.connect).toHaveBeenCalledWith("OneGate");
    expect(toast.success).toHaveBeenCalledWith("header.connectedAs");
  });

  it("does not connect from a stale WalletConnect approval after the QR modal is closed", async () => {
    let resolveApproval;
    walletServiceMock.getAvailableProviders.mockReturnValue(["WalletConnect"]);
    walletServiceMock.connect.mockResolvedValueOnce({
      uri: "wc:stale-header-approval",
      approval: new Promise((resolve) => {
        resolveApproval = resolve;
      }),
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");
    await connectButton.trigger("click");
    await flushPromises();

    const walletConnectButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("WalletConnect"));
    await walletConnectButton.trigger("click");
    await flushPromises();

    const walletConnectModal = wrapper.findComponent({ name: "WalletConnectModal" });
    expect(walletConnectModal.exists()).toBe(true);

    walletConnectModal.vm.$emit("close");
    await flushPromises();

    resolveApproval({ address: "NStaleWalletConnectApproval111111111111" });
    await flushPromises();

    expect(walletServiceMock.cancelPendingConnection).toHaveBeenCalledTimes(1);
    expect(connectedAccountRef.value).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
    expect(wrapper.findComponent({ name: "WalletConnectModal" }).exists()).toBe(false);
  });

  it("refreshes the open wallet modal when NeoLine finishes injecting", async () => {
    walletServiceMock.getAvailableProviders
      .mockReturnValueOnce([])
      .mockReturnValueOnce(["NeoLine"]);

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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");
    await connectButton.trigger("click");
    await flushPromises();

    let neoLineButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("NeoLine"));
    expect(neoLineButton.text()).toContain("header.providerNeoLine");

    window.dispatchEvent(new Event("NEOLine.N3.EVENT.READY"));
    await flushPromises();

    neoLineButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("NeoLine"));
    expect(neoLineButton.text()).not.toContain("header.providerNeoLine");
  });

  it("validates an already connected wallet when the Explorer network changes", async () => {
    connectedAccountRef.value = "NconnectedWalletAddress";
    walletServiceMock.ensureNetworkConsistency.mockRejectedValueOnce(new Error("Wallet network mismatch"));

    const AppHeader = (await import("@/components/layout/AppHeader.vue")).default;
    mount(AppHeader, {
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
    window.dispatchEvent(new CustomEvent("network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(walletServiceMock.ensureNetworkConsistency).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Wallet network mismatch");
  });

  it("keeps wallet network errors visible until the user disconnects", async () => {
    connectedAccountRef.value = "NconnectedWalletAddress";
    const walletState = await import("@/utils/walletState");
    walletState.connectedWalletProvider.value = "NeoLine";
    walletState.walletNetworkError.value = "Network mismatch. Switch your wallet to Mainnet and try again.";

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

    const alert = wrapper.get('[data-testid="wallet-attention"]');
    expect(alert.text()).toContain("header.walletIssue");
    expect(alert.text()).toContain("Network mismatch. Switch your wallet to Mainnet and try again.");

    const walletButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().trim() === "Nconne...ress");
    expect(walletButton.attributes("title")).toBe("Network mismatch. Switch your wallet to Mainnet and try again.");
    expect(walletButton.attributes("aria-label")).toBe(
      "header.walletIssueAria:NeoLine:Network mismatch. Switch your wallet to Mainnet and try again.",
    );

    await wrapper.get('[data-testid="wallet-attention-disconnect"]').trigger("click");
    await flushPromises();

    expect(disconnectWalletMock).toHaveBeenCalledTimes(1);
    expect(walletServiceMock.disconnect).toHaveBeenCalledTimes(1);
  });

  it("keeps remote wallet network errors accessible after the wallet session is disconnected", async () => {
    connectedAccountRef.value = "";
    const walletState = await import("@/utils/walletState");
    walletState.connectedWalletProvider.value = "Neon Wallet";
    walletState.walletNetworkError.value = "WalletConnect session is on neo3:testnet; reconnect on neo3:mainnet.";

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
          $t: (value, params = {}) => {
            if (value === "header.walletIssue") return `${value}:${params.provider || ""}`;
            return value;
          },
        },
      },
    });

    await flushPromises();

    const alert = wrapper.get('[data-testid="wallet-attention"]');
    expect(alert.text()).toContain("header.walletIssue:Neon Wallet");
    expect(alert.text()).toContain("WalletConnect session is on neo3:testnet; reconnect on neo3:mainnet.");

    const walletButtons = wrapper
      .findAll("button")
      .filter((candidate) => candidate.text().includes("header.connectWallet"));
    expect(walletButtons.length).toBeGreaterThan(0);
    for (const button of walletButtons) {
      expect(button.attributes("title")).toBe("WalletConnect session is on neo3:testnet; reconnect on neo3:mainnet.");
      expect(button.attributes("aria-label")).toBe(
        "header.walletIssueAria:Neon Wallet:WalletConnect session is on neo3:testnet; reconnect on neo3:mainnet.",
      );
    }
  });

  it("dedupes overlapping wallet network validations from rapid network events", async () => {
    connectedAccountRef.value = "NconnectedWalletAddress";
    let rejectValidation;
    walletServiceMock.ensureNetworkConsistency.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectValidation = reject;
      }),
    );

    const AppHeader = (await import("@/components/layout/AppHeader.vue")).default;
    mount(AppHeader, {
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
    window.dispatchEvent(new CustomEvent("network-change", { detail: { env: "TestT5" } }));
    window.dispatchEvent(new CustomEvent("network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(walletServiceMock.ensureNetworkConsistency).toHaveBeenCalledTimes(1);

    rejectValidation(new Error("Wallet network mismatch"));
    await flushPromises();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Wallet network mismatch");
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
      .find((candidate) => candidate.text().trim() === "header.connectWallet");

    await connectButton.trigger("click");
    await flushPromises();

    expect(wrapper.find('img[alt="NeoLine"]').attributes("src")).toBe('/img/brand/neoline.svg');
    expect(wrapper.find('img[alt="OneGate"]').attributes("src")).toBe('/img/brand/onegate.ico');
    expect(wrapper.find('img[alt="Neon Wallet"]').attributes("src")).toBe('/img/brand/neon.ico');
    expect(wrapper.find('img[alt="WalletConnect"]').attributes("src")).toBe('/img/brand/walletconnect.ico');
    expect(wrapper.find('img[alt="Web3Auth"]').attributes("src")).toBe('/img/brand/web3auth.png');
    const evmWalletIconSrc = wrapper.find('img[alt="EVM Wallet"]').attributes("src");
    expect(evmWalletIconSrc).not.toMatch(/^https?:\/\//);
    expect(evmWalletIconSrc).toMatch(/^(\/img\/brand\/evm-wallet\.svg|data:image\/svg\+xml)/);
  });
});
