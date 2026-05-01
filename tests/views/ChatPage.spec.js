import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

const routeRef = {
  value: {
    fullPath: "/chat?with=alice.neo",
    query: { with: "alice.neo" },
  },
};
const replaceMock = vi.fn(() => Promise.resolve());
const pushMock = vi.fn(() => Promise.resolve());
const connectedAccountRef = ref("NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w");
const chatSessionRef = ref({ address: connectedAccountRef.value });
const restoreChatSessionMock = vi.fn(async () => chatSessionRef.value);
const ensureInteractiveChatSessionMock = vi.fn(async () => chatSessionRef.value);
const refreshNotificationsMock = vi.fn(async () => ({ unreadCount: 0, notifications: [] }));
const getRoomsMock = vi.fn(async () => []);
const ensureRoomMock = vi.fn(async () => ({
  roomId: "room-1",
  otherParticipantAddress: "NZgtM6nRnMNe86ce8f2UVHAeUismyG157h",
  otherParticipantLabel: "alice.neo",
}));
const getMessagesMock = vi.fn(async () => []);
const markRoomReadMock = vi.fn(async () => ({ updated: 1 }));
const resolveDomainMock = vi.fn(async () => "NZgtM6nRnMNe86ce8f2UVHAeUismyG157h");

vi.mock("vue-router", () => ({
  useRoute: () => routeRef.value,
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount: connectedAccountRef,
}));

vi.mock("@/composables/useChatSession", () => ({
  useChatSession: () => ({
    chatSession: chatSessionRef,
    restoreChatSession: restoreChatSessionMock,
    ensureInteractiveChatSession: ensureInteractiveChatSessionMock,
    refreshNotifications: refreshNotificationsMock,
  }),
}));

vi.mock("@/services/chatService", () => ({
  chatService: {
    getRooms: getRoomsMock,
    ensureRoom: ensureRoomMock,
    getMessages: getMessagesMock,
    markRoomRead: markRoomReadMock,
    sendMessage: vi.fn(),
  },
}));

vi.mock("@/services/nnsService", () => ({
  default: {
    resolveDomain: resolveDomainMock,
  },
}));

vi.mock("@cityofzion/neon-js", () => ({
  Wallet: {
    isAddress: vi.fn((addr) => {
      // Return true only for actual Neo addresses, false for domains
      return addr && addr.startsWith("N") && addr.length === 34;
    }),
  },
}));

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.Neon = {
      wallet: {
        isAddress: vi.fn((addr) => addr && addr.startsWith("N") && addr.length === 34),
      },
    };
    routeRef.value = {
      fullPath: "/chat?with=alice.neo",
      query: { with: "alice.neo" },
    };
    connectedAccountRef.value = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
    chatSessionRef.value = { address: connectedAccountRef.value };
  });

  it("opens or creates the canonical room from the route target and loads history", async () => {
    const ChatPage = (await import("@/views/Chat/ChatPage.vue")).default;
    mount(ChatPage, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          ChatSidebar: { template: "<div />" },
          ChatThread: { template: "<div />" },
        },
      },
    });

    await flushPromises();
    await flushPromises();

    expect(restoreChatSessionMock).toHaveBeenCalled();
    expect(resolveDomainMock).toHaveBeenCalledWith("alice.neo");
    expect(ensureRoomMock).toHaveBeenCalledWith({
      peerAddress: "NZgtM6nRnMNe86ce8f2UVHAeUismyG157h",
      peerLabel: "alice.neo",
    });
    expect(getMessagesMock).toHaveBeenCalledWith("room-1", { limit: 100 });
    expect(markRoomReadMock).toHaveBeenCalledWith("room-1");
    expect(replaceMock).toHaveBeenCalledWith({
      path: "/chat",
      query: { room: "room-1" },
    });
  });
});
