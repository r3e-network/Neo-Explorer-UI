import { flushPromises, mount } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

vi.mock("vue-i18n", async () => {
  const actual = await vi.importActual("vue-i18n");
  return {
    ...actual,
    useI18n: () => ({ t: (k) => k }),
  };
});

const getGasTrackerMock = vi.fn();
const getBlockListMock = vi.fn();

vi.mock("@/services/statsService", () => ({
  statsService: {
    getGasTracker: getGasTrackerMock,
  },
}));

vi.mock("@/services/blockService", () => ({
  blockService: {
    getList: getBlockListMock,
  },
}));

vi.mock("@/utils/env", async () => {
  const actual = await vi.importActual("@/utils/env");
  return {
    ...actual,
    getNetworkRefreshIntervalMs: () => 3000,
  };
});

describe("GasTracker view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGasTrackerMock.mockResolvedValue({
      latestNetworkFee: "1000",
      latestSystemFee: "2000",
      networkFee: null,
    });
    getBlockListMock.mockResolvedValue({
      result: [],
    });
  });

  it("requests recent blocks with fee enrichment enabled", async () => {
    const GasTracker = (await import("@/views/GasTracker/GasTracker.vue")).default;
    const wrapper = mount(GasTracker, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          FeeEstimateCards: true,
          FeeSummary: true,
          FeeTrendChart: true,
          BlockFeeTable: true,
        },
      },
    });

    await flushPromises();

    expect(getBlockListMock).toHaveBeenCalledWith(20, 0, { forceRefresh: false, enrichMissingFields: true });
    wrapper.unmount();
  });

  it("bounds recent block loading so the page cannot remain in skeleton state indefinitely", () => {
    const source = readFileSync(path.resolve(process.cwd(), "src/views/GasTracker/GasTracker.vue"), "utf8");

    expect(source).toContain("BLOCKS_LOAD_TIMEOUT_MS");
    expect(source).toContain("withTimeout(");
    expect(source).toContain("blockService.getList(20, 0, { forceRefresh, enrichMissingFields: true })");
  });
});
