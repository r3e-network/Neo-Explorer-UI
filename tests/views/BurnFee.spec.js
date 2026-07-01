import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDailyAnalyticsMock, useNetworkChangeMock } = vi.hoisted(() => ({
  getDailyAnalyticsMock: vi.fn(),
  useNetworkChangeMock: vi.fn(),
}));

vi.mock("vue-i18n", async () => {
  const { ref } = await vi.importActual("vue");
  const locale = ref("en");
  return {
    useI18n: () => ({
      t: (key) => key,
      locale,
    }),
  };
});

vi.mock("@/composables/useTheme", async () => {
  const { ref } = await vi.importActual("vue");
  const isDark = ref(false);
  return {
    useTheme: () => ({ isDark }),
  };
});

vi.mock("@/services/statsService", () => ({
  statsService: {
    getDailyAnalytics: getDailyAnalyticsMock,
  },
}));

vi.mock("@/composables/useNetworkChange", () => ({
  useNetworkChange: useNetworkChangeMock,
}));

vi.mock("@/utils/env", async () => {
  const actual = await vi.importActual("@/utils/env");
  return {
    ...actual,
    resolveNetworkName: (network) => network || "mainnet",
  };
});

vi.mock("chart.js", () => ({
  default: vi.fn(function Chart() {
    this.destroy = vi.fn();
  }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

function mountBurnFee() {
  return mount(BurnFee, {
    global: {
      plugins: [i18nPlugin],
      stubs: {
        Breadcrumb: true,
        Skeleton: { template: '<div data-test="skeleton" />' },
        ErrorState: { template: '<div data-test="burn-error"><button @click="$emit(\'retry\')" /></div>' },
      },
    },
  });
}

let originalGetContext;
let BurnFee;

describe("BurnFee view", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}));
    BurnFee = (await import("@/views/BurnGas/BurnFee.vue")).default;
  });

  afterEach(() => {
    vi.useRealTimers();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("passes a bounded timeout and renders converted GAS values", async () => {
    getDailyAnalyticsMock.mockResolvedValue([
      { day: "2026-06-30", tx_count: "2", fee_burned: "100000000" },
      { day: "2026-07-01", tx_count: "3", fee_burned: "250000000" },
    ]);

    const wrapper = mountBurnFee();
    await flushPromises();

    expect(getDailyAnalyticsMock).toHaveBeenCalledWith(
      30,
      expect.objectContaining({
        network: "mainnet",
        timeoutMs: expect.any(Number),
      }),
    );
    expect(wrapper.findAll('[data-test="skeleton"]')).toHaveLength(0);
    expect(wrapper.text()).toContain("3.50000000");
    expect(wrapper.text()).toContain("0.70000000");

    wrapper.unmount();
  });

  it("shows an error state instead of keeping skeletons forever when analytics hangs", async () => {
    vi.useFakeTimers();
    getDailyAnalyticsMock.mockReturnValue(new Promise(() => {}));

    const wrapper = mountBurnFee();
    expect(wrapper.findAll('[data-test="skeleton"]').length).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(9_000);
    await flushPromises();

    expect(wrapper.findAll('[data-test="skeleton"]')).toHaveLength(0);
    expect(wrapper.find('[data-test="burn-error"]').exists()).toBe(true);

    wrapper.unmount();
  });
});
