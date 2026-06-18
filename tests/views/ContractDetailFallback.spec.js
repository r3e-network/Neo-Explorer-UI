import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const route = { params: { hash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd" } };
const getByHashWithFallback = vi.fn();
const getManifest = vi.fn();
const getVerifiedByHash = vi.fn();
const getContractMetadata = vi.fn();
const invokeRead = vi.fn();
const connect = vi.fn();
const disconnect = vi.fn();
const invoke = vi.fn();

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
    getByHashWithFallback,
    getManifest,
    getVerifiedByHash,
    invokeRead,
  },
}));

vi.mock("@/services/walletService", () => ({
  walletService: {
    connect,
    disconnect,
    invoke,
  },
  WALLET_STATE_EVENT: "neo-explorer:wallet-state-changed",
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadata,
  },
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

describe("ContractDetail indexed miss fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByHashWithFallback.mockResolvedValue({
      hash: route.params.hash,
      name: "NameService",
      updatecounter: 0,
      manifest: {
        name: "NameService",
        abi: {
          methods: [{ name: "register", safe: false }],
          events: [{ name: "Transfer" }],
        },
      },
    });
    getManifest.mockResolvedValue(null);
    getVerifiedByHash.mockResolvedValue(null);
    getContractMetadata.mockResolvedValue(null);
  });

  it("shows a loading state instead of an unknown contract placeholder before details resolve", async () => {
    let resolveContract;
    getByHashWithFallback.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveContract = resolve;
      }),
    );

    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          TabsNav: true,
          ScCallTable: true,
          EventsTable: true,
          ContractCodeTab: true,
          ContractReadTab: true,
          ContractWriteTab: true,
          ErrorState: true,
          ContractHeader: {
            template: '<div data-test="header">{{ contract.name }}</div>',
            props: ["contract", "metadata", "isVerified", "supportedStandards"],
          },
          ContractOverviewCard: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-test="header"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("contractDetail.loadingDetails");
    expect(wrapper.text()).not.toContain("contractDetail.headerUnknownContract");

    resolveContract({
      hash: route.params.hash,
      name: "NameService",
      manifest: { name: "NameService", abi: { methods: [], events: [] } },
    });
    await flushPromises();

    expect(wrapper.get('[data-test="header"]').text()).toBe("NameService");
  });

  it("renders contract details from native chain state when the indexed contract record is missing", async () => {
    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          TabsNav: true,
          ScCallTable: true,
          EventsTable: true,
          ContractCodeTab: true,
          ContractReadTab: true,
          ContractWriteTab: true,
          ErrorState: {
            template: '<div data-test="error">{{ message }}</div>',
            props: ["title", "message"],
          },
          ContractHeader: {
            template: '<div data-test="header">{{ contract.name }}</div>',
            props: ["contract", "metadata", "isVerified", "supportedStandards"],
          },
          ContractOverviewCard: {
            template: '<div data-test="overview">{{ contract.hash }}|{{ methodsCount }}|{{ eventsCount }}</div>',
            props: ["contract", "metadata", "manifest", "isVerified", "supportedStandards", "methodsCount", "eventsCount"],
          },
        },
      },
    });

    await flushPromises();

    expect(getByHashWithFallback).toHaveBeenCalledWith(route.params.hash);
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="header"]').text()).toBe("NameService");
    expect(wrapper.get('[data-test="overview"]').text()).toContain(route.params.hash);
    expect(wrapper.get('[data-test="overview"]').text()).toContain("|1|1");
  });

  it("passes indexed contract metadata through to the detail header", async () => {
    getByHashWithFallback.mockResolvedValueOnce({
      hash: route.params.hash,
      name: "",
      updatecounter: 0,
      manifest: { abi: { methods: [], events: [] } },
    });
    getContractMetadata.mockResolvedValueOnce({
      name: "NeoToken",
      display_name: "NeoToken",
      is_verified: true,
    });

    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          TabsNav: true,
          ScCallTable: true,
          EventsTable: true,
          ContractCodeTab: true,
          ContractReadTab: true,
          ContractWriteTab: true,
          ErrorState: true,
          ContractHeader: {
            template: '<div data-test="header">{{ metadata && metadata.name }}|{{ isVerified }}</div>',
            props: ["contract", "metadata", "isVerified", "supportedStandards"],
          },
          ContractOverviewCard: true,
        },
      },
    });

    await flushPromises();

    expect(getContractMetadata).toHaveBeenCalledWith(route.params.hash);
    expect(wrapper.get('[data-test="header"]').text()).toBe("NeoToken|true");
  });
});
