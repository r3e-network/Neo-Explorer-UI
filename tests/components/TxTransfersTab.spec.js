import { mount, config } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { GAS_HASH } from "@/constants";

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadataBatch: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/services/tokenService", () => ({
  tokenService: {
    getByHash: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/utils/getTokenIcon", () => ({
  getTokenIcon: vi.fn(() => "/token.png"),
}));

describe("TxTransfersTab", () => {
  it("uses native token metadata as the label fallback", async () => {
    const component = (await import("@/views/Transaction/components/TxTransfersTab.vue")).default;

    const wrapper = mount(component, {
      props: {
        allTransfers: [
          {
            _standard: "NEP-17",
            amount: "6500000",
            decimals: 8,
            contract: GAS_HASH,
            contractHash: GAS_HASH,
            from: null,
            to: null,
          },
        ],
        transfersLoading: false,
      },
      global: {
        stubs: {
          EmptyState: true,
          EtherscanPagination: true,
          HashLink: { props: ["hash"], template: "<span>{{ hash }}</span>" },
        },
      },
    });

    expect(wrapper.text()).toContain("GasToken");
    expect(wrapper.text()).not.toContain("txDetail.transfersUnknownToken");
  });
});
