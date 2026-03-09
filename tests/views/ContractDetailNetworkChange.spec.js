import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const route = { params: { hash: "0xabc" } };
const getByHash = vi.fn();
const getManifest = vi.fn();
const getVerifiedByHash = vi.fn();
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

vi.mock("@/services", () => ({
  contractService: {
    getByHash,
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
    getByHash.mockResolvedValue({ hash: "0xabc", name: "Test Contract", updatecounter: 0 });
    getManifest.mockResolvedValue({ abi: { methods: [], events: [] } });
    getVerifiedByHash.mockResolvedValue(null);
  });

  it("reloads the current contract when the explorer network changes", async () => {
    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
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
    expect(getByHash).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(getByHash).toHaveBeenCalledTimes(2);
    expect(getByHash).toHaveBeenNthCalledWith(2, "0xabc");
    wrapper.unmount();
  });
});
