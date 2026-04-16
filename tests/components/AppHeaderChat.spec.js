import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const fetchPricesMock = vi.fn();
const initWalletMock = vi.fn();
const disconnectWalletMock = vi.fn();
const connectedAccountRef = ref("NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w");
const chatSessionRef = ref({ address: connectedAccountRef.value });
const unreadCountRef = ref(2);
const notificationsRef = ref([
    {
      roomId: "room-1",
      otherParticipantAddress: "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp",
      otherParticipantLabel: "Binance",
      preview: "hello",
      unreadCount: 2,
    },
  ]);
const ensureInteractiveChatSessionMock = vi.fn(async () => true);
const refreshNotificationsMock = vi.fn(async () => undefined);
const restoreChatSessionMock = vi.fn(async () => chatSessionRef.value);
const clearChatSessionMock = vi.fn();
const walletServiceConnectMock = vi.fn();

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
  walletService: {
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
    connect: walletServiceConnectMock,
    disconnect: vi.fn(),
  },
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock("@/composables/useChatSession", () => ({
  useChatSession: () => ({
    chatSession: chatSessionRef,
    unreadCount: unreadCountRef,
    notifications: notificationsRef,
    restoreChatSession: restoreChatSessionMock,
    ensureInteractiveChatSession: ensureInteractiveChatSessionMock,
    refreshNotifications: refreshNotificationsMock,
    clearChatSession: clearChatSessionMock,
  }),
}));

describe("AppHeader chat notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPricesMock.mockResolvedValue({
      neo: 0,
      gas: 0,
      neoChange: 0,
      gasChange: 0,
    });
    connectedAccountRef.value = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
    chatSessionRef.value = { address: connectedAccountRef.value };
    unreadCountRef.value = 2;
    notificationsRef.value = [
      {
        roomId: "room-1",
        otherParticipantAddress: "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp",
        otherParticipantLabel: "Binance",
        preview: "hello",
        unreadCount: 2,
      },
    ];
  });

  it("does not auto-request NeoChat authorization after a wallet connection", async () => {
    connectedAccountRef.value = null;
    chatSessionRef.value = null;
    unreadCountRef.value = 0;
    notificationsRef.value = [];

    const { walletService } = await import("@/services/walletService");
    walletService.getAvailableProviders.mockReturnValueOnce(["NeoLine"]);
    walletService.getSupportedProviders.mockReturnValueOnce(["NeoLine"]);
    walletServiceConnectMock.mockResolvedValueOnce({
      address: "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w",
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

    const connectButton = wrapper.findAll("button").find((candidate) => candidate.text().trim() === "Connect Wallet");
    await connectButton.trigger("click");
    await flushPromises();

    const neoLineButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("NeoLine"));
    await neoLineButton.trigger("click");
    await flushPromises();

    expect(walletServiceConnectMock).toHaveBeenCalledWith("NeoLine");
    expect(ensureInteractiveChatSessionMock).not.toHaveBeenCalled();
  });

  it("shows unread chat badge for connected users with an active chat session", async () => {
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

    expect(restoreChatSessionMock).toHaveBeenCalled();
    expect(refreshNotificationsMock).toHaveBeenCalled();
    const badge = wrapper.find('[data-testid="chat-unread-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe("2");
  });

  it("navigates to the internal chat room when a chat notification is clicked", async () => {
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

    await wrapper.get('[data-testid="chat-notifications-button"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="chat-notification-item"]').trigger("click");

    expect(pushMock).toHaveBeenCalledWith({
      path: "/chat",
      query: { room: "room-1" },
    });
  });
});
