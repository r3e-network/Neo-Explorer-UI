import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/explorerFormat", () => ({
  formatGas: (value) => String(value),
  formatAge: () => "just now",
  formatTime: () => "Thu, 01 Jan 1970 00:00:00 GMT",
}));


vi.mock("@/utils/healthCheck", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadataBatch: vi.fn().mockResolvedValue({}),
  },
}));

let consoleWarnSpy;

describe("TxOverviewTab", () => {
  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy?.mockRestore();
  });

  it("marks system fee as burned in red after the fee value", async () => {
    const TxOverviewTab = (await import("@/views/Transaction/components/TxOverviewTab.vue")).default;
    const wrapper = mount(TxOverviewTab, {
      props: {
        tx: {
          hash: "0xtx",
          sender: "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp",
          sysfee: 1,
          netfee: 2,
        },
        txStatus: "success",
        vmState: "HALT",
        confirmations: 1,
        totalFee: "3",
        allTransfers: [],
        showMore: false,
      },
      global: {
        stubs: {
          InfoRow: {
            props: ["label", "value", "tooltip", "copyable", "copyValue"],
            template: '<div :data-label="label"><slot>{{ value }}</slot></div>',
          },
          HashLink: true,
          StatusBadge: true,
          GasBreakdown: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    const systemFeeRow = wrapper.find('[data-label="System Fee"]');
    expect(systemFeeRow.exists()).toBe(true);
    expect(systemFeeRow.text()).toContain("1 GAS");
    expect(systemFeeRow.text()).toContain("burned");
    const burnedBadge = systemFeeRow.find(".text-red-600");
    expect(burnedBadge.exists()).toBe(true);
  });
});
