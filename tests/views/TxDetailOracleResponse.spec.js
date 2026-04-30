import { mount, flushPromises, config } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };

const route = { params: { txhash: "0xtx" } };
const getByHash = vi.fn();
const getTransfersByTxHash = vi.fn();
const getNep11TransfersByTxHash = vi.fn();
const getCount = vi.fn();
const getEnrichedTrace = vi.fn();
const getExecutionTrace = vi.fn();
const isComplexTransaction = vi.fn(() => false);
const buildCallTree = vi.fn(() => []);

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
  transactionService: {
    getByHash,
  },
  tokenService: {
    getTransfersByTxHash,
    getNep11TransfersByTxHash,
  },
  blockService: {
    getCount,
  },
  executionService: {
    getEnrichedTrace,
    getExecutionTrace,
    isComplexTransaction,
    buildCallTree,
  },
}));

describe("TxDetail oracle response labeling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.txhash = "0xtx";
    getByHash.mockResolvedValue({
      hash: "0xtx",
      blockIndex: 1,
      netfee: 0,
      sysfee: 0,
      attributes: [{ type: "OracleResponse" }],
    });
    getTransfersByTxHash.mockResolvedValue({ result: [] });
    getNep11TransfersByTxHash.mockResolvedValue({ result: [] });
    getCount.mockResolvedValue(100);
    getEnrichedTrace.mockResolvedValue({ raw: null, executions: [] });
    getExecutionTrace.mockResolvedValue(null);
  });

  it("shows Oracle Callback in the action summary banner", async () => {
    const TxDetail = (await import("@/views/Transaction/TxDetail.vue")).default;
    const wrapper = mount(TxDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          TxHeader: true,
          StateChangeSummary: true,
          Skeleton: true,
          ErrorState: true,
          TabsNav: true,
          TxOverviewTab: true,
          TxScriptTab: true,
          TxLogsTab: true,
          TxTransfersTab: true,
          InternalOperations: true,
          TxExecutionTraceTab: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("txDetail.actionOracle");
    wrapper.unmount();
  });
});
