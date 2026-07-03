import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AddressRadarTab from "@/views/Account/components/AddressRadarTab.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key, params = {}) => `${key}${params.count ? `:${params.count}` : ""}` }),
}));

const CENTER = "Ncenter111111111111111111111111111111";
const ALICE = "NAlice1111111111111111111111111111111";
const BOB = "NBob11111111111111111111111111111111";
const TARGET = "NTarget11111111111111111111111111111";

function mountRadar(props = {}) {
  return mount(AddressRadarTab, {
    props: {
      address: CENTER,
      nep17Transfers: [],
      nep11Transfers: [],
      loading: false,
      error: "",
      ...props,
    },
    global: {
      stubs: {
        HashLink: { props: ["hash"], template: "<span data-testid='hash-link'>{{ hash }}</span>" },
      },
    },
  });
}

describe("AddressRadarTab", () => {
  it("renders a direct transfer relationship graph for the current address", () => {
    const wrapper = mountRadar({
      nep17Transfers: [
        { txHash: "0x-in", from: ALICE, to: CENTER, tokenName: "GAS", timestamp: 20 },
        { txHash: "0x-out", from: CENTER, to: BOB, tokenName: "NEO", timestamp: 10 },
      ],
    });

    expect(wrapper.get('[data-testid="asset-radar-graph"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="asset-radar-node"]')).toHaveLength(3);
    expect(wrapper.text()).toContain("addressDetail.radarSummaryInbound");
    expect(wrapper.text()).toContain("addressDetail.radarSummaryOutbound");
    expect(wrapper.text()).toContain("GAS");
    expect(wrapper.text()).toContain("NEO");
  });

  it("searches and renders a multi-hop path between two addresses", async () => {
    const fetchTransfers = vi.fn(async (address) => {
      if (address === CENTER) return [{ txHash: "0x-a", from: CENTER, to: ALICE, tokenName: "GAS" }];
      if (address === ALICE) return [{ txHash: "0x-b", from: ALICE, to: TARGET, tokenName: "GAS" }];
      return [];
    });
    const wrapper = mountRadar({ fetchTransfers });

    await wrapper.get('[data-testid="radar-mode-path"]').trigger("click");
    await wrapper.get('[data-testid="radar-target-input"]').setValue(TARGET);
    await wrapper.get('[data-testid="radar-path-form"]').trigger("submit");
    await flushPromises();

    expect(fetchTransfers).toHaveBeenCalledWith(CENTER, expect.objectContaining({ limit: expect.any(Number) }));
    expect(wrapper.get('[data-testid="asset-radar-path-status"]').text()).toContain(
      "addressDetail.radarPathFound",
    );
    expect(wrapper.findAll('[data-testid="asset-radar-node"]')).toHaveLength(3);
    expect(wrapper.text()).toContain("0x-a");
    expect(wrapper.text()).toContain("0x-b");
  });
});
