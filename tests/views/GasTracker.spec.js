import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getGasTrackerMock = vi.fn();
const getBlockListMock = vi.fn();

vi.mock("@/services", () => ({
  statsService: {
    getGasTracker: getGasTrackerMock,
  },
  blockService: {
    getList: getBlockListMock,
  },
}));

vi.mock("@/utils/env", async () => {
  const actual = await vi.importActual("@/utils/env");
  return {
    ...actual,
    getNetworkRefreshIntervalMs: () => 15000,
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
});
