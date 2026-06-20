import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const route = { params: { hash: "0xabc" } };
const getByHash = vi.fn();
const getByHashWithFallback = vi.fn();
const getManifest = vi.fn();
const getVerifiedByHash = vi.fn();
const invokeRead = vi.fn();
const connect = vi.fn();
const disconnect = vi.fn();
const cancelPendingConnection = vi.fn();
const invoke = vi.fn();
const getAvailableProviders = vi.fn();
const getSupportedProviders = vi.fn();

const walletServiceMock = {
  connect,
  disconnect,
  cancelPendingConnection,
  invoke,
  isConnected: false,
  account: null,
  provider: null,
  getAvailableProviders,
  getSupportedProviders,
};

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

vi.mock("@/utils/healthCheck", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

vi.mock("@/services/contractService", () => ({
  contractService: {
    getByHash,
    getByHashWithFallback,
    getManifest,
    getVerifiedByHash,
    invokeRead,
  },
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
  WALLET_STATE_EVENT: "neo-explorer:wallet-state-changed",
}));

vi.mock("@/utils/lazyServices", () => ({
  loadWalletService: vi.fn(() => Promise.resolve(walletServiceMock)),
}));

vi.mock("@/composables/useMethodInteraction", () => ({
  useMethodInteraction: () => ({
    methodState: {},
    toggleMethod: vi.fn(),
    updateParam: vi.fn(),
    invokeMethod: vi.fn(),
    estimateGas: vi.fn(),
  }),
}));

vi.mock("@/composables/useTransactionTracker", () => ({
  useTransactionTracker: () => ({
    txStatuses: {},
    track: vi.fn(),
  }),
}));

describe("ContractDetail network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.hash = "0xabc";
    getByHashWithFallback.mockResolvedValue({ hash: "0xabc", name: "Test Contract", updatecounter: 0 });
    getManifest.mockResolvedValue({ abi: { methods: [], events: [] } });
    getVerifiedByHash.mockResolvedValue(null);
    walletServiceMock.isConnected = false;
    walletServiceMock.account = null;
    walletServiceMock.provider = null;
    getAvailableProviders.mockReturnValue([]);
    getSupportedProviders.mockReturnValue(["NeoLine", "OneGate", "WalletConnect"]);
  });

  it("reloads the current contract when the explorer network changes", async () => {
    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          TabsNav: true,
          ScCallTable: true,
          EventsTable: true,
          ErrorState: true,
          ContractHeader: true,
          ContractOverviewCard: true,
          ContractCodeTab: true,
          ContractReadTab: true,
          ContractWriteTab: true,
        },
      },
    });

    await flushPromises();
    expect(getByHashWithFallback).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(getByHashWithFallback).toHaveBeenCalledTimes(2);
    expect(getByHashWithFallback).toHaveBeenNthCalledWith(2, "0xabc", { network: "mainnet" });
    wrapper.unmount();
  });

  it("refreshes write-tab wallet availability when a wallet injects after the tab is open", async () => {
    getAvailableProviders
      .mockReturnValueOnce([])
      .mockReturnValueOnce(["NeoLine"]);

    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          ScCallTable: true,
          EventsTable: true,
          ErrorState: true,
          ContractHeader: true,
          ContractOverviewCard: true,
          ContractCodeTab: true,
          ContractReadTab: true,
          TabsNav: {
            props: ["tabs", "modelValue"],
            emits: ["update:modelValue"],
            template: '<button data-test="write-tab" @click="$emit(\'update:modelValue\', \'writeContract\')">Write</button>',
          },
          ContractWriteTab: {
            props: ["availableWalletProviders", "walletProviderAvailabilityLoaded"],
            template: '<div data-test="write-panel">{{ walletProviderAvailabilityLoaded }}|{{ availableWalletProviders.join(",") }}</div>',
          },
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-test="write-tab"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-test="write-panel"]').text()).toBe("true|");

    window.dispatchEvent(new Event("NEOLine.N3.EVENT.READY"));
    await flushPromises();

    expect(wrapper.get('[data-test="write-panel"]').text()).toBe("true|NeoLine");
    wrapper.unmount();
  });

  it("does not mark the write tab connected from a stale WalletConnect approval after closing the QR modal", async () => {
    let resolveApproval;
    getAvailableProviders.mockReturnValue(["WalletConnect"]);
    connect.mockResolvedValueOnce({
      uri: "wc:stale-contract-write",
      approval: new Promise((resolve) => {
        resolveApproval = resolve;
      }),
    });

    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          ScCallTable: true,
          EventsTable: true,
          ErrorState: true,
          ContractHeader: true,
          ContractOverviewCard: true,
          ContractCodeTab: true,
          ContractReadTab: true,
          TabsNav: {
            props: ["tabs", "modelValue"],
            emits: ["update:modelValue"],
            template: '<button data-test="write-tab" @click="$emit(\'update:modelValue\', \'writeContract\')">Write</button>',
          },
          ContractWriteTab: {
            props: [
              "walletConnected",
              "walletAccount",
              "walletProvider",
              "walletConnecting",
              "walletError",
              "wcUri",
            ],
            emits: ["connectWallet", "clearWcUri"],
            template: `
              <div data-test="write-panel">
                <button data-test="connect-walletconnect" @click="$emit('connectWallet', 'WalletConnect')">WalletConnect</button>
                <button v-if="wcUri" data-test="close-walletconnect" @click="$emit('clearWcUri')">Close</button>
                <span data-test="wc-uri">{{ wcUri }}</span>
                <span data-test="connected-address">{{ walletConnected ? walletAccount?.address : '' }}</span>
              </div>
            `,
          },
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-test="write-tab"]').trigger("click");
    await flushPromises();

    await wrapper.get('[data-test="connect-walletconnect"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-test="wc-uri"]').text()).toBe("wc:stale-contract-write");
    await wrapper.get('[data-test="close-walletconnect"]').trigger("click");
    await flushPromises();

    resolveApproval({ address: "NStaleContractWriteApproval1111111111" });
    await flushPromises();

    expect(cancelPendingConnection).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-test="wc-uri"]').text()).toBe("");
    expect(wrapper.get('[data-test="connected-address"]').text()).toBe("");
    wrapper.unmount();
  });
});
