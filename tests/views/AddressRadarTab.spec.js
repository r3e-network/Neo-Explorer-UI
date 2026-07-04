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

  it("renders a server-built direct graph without raw transfer rows", () => {
    const wrapper = mountRadar({
      graph: {
        nodes: [
          { id: CENTER.toLowerCase(), address: CENTER, role: "center", inCount: 1, outCount: 1, transferCount: 2 },
          { id: ALICE.toLowerCase(), address: ALICE, role: "source", inCount: 0, outCount: 1, transferCount: 1 },
          { id: BOB.toLowerCase(), address: BOB, role: "sink", inCount: 1, outCount: 0, transferCount: 1 },
        ],
        edges: [
          { id: "in", from: ALICE, to: CENTER, count: 1, tokens: ["GAS"], txHashes: ["0x-in"] },
          { id: "out", from: CENTER, to: BOB, count: 1, tokens: ["NEO"], txHashes: ["0x-out"] },
        ],
        summary: {
          inboundAccounts: 1,
          outboundAccounts: 1,
          transferCount: 2,
          hiddenCounterparties: 0,
        },
      },
    });

    expect(wrapper.get('[data-testid="asset-radar-graph"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="asset-radar-node"]')).toHaveLength(3);
    expect(wrapper.text()).toContain("0x-in");
    expect(wrapper.text()).toContain("0x-out");
  });

  it("searches and renders a multi-hop path between two addresses", async () => {
    const fetchPath = vi.fn(async () => ({
      result: {
        found: true,
        depth: 2,
        visitedCount: 2,
        nodes: [
          { id: CENTER.toLowerCase(), address: CENTER, role: "source" },
          { id: ALICE.toLowerCase(), address: ALICE, role: "bridge" },
          { id: TARGET.toLowerCase(), address: TARGET, role: "target" },
        ],
        edges: [
          { txHash: "0x-a", from: CENTER, to: ALICE, tokenName: "GAS" },
          { txHash: "0x-b", from: ALICE, to: TARGET, tokenName: "GAS" },
        ],
      },
      graph: {
        nodes: [
          { id: CENTER.toLowerCase(), address: CENTER, role: "source", inCount: 0, outCount: 1, transferCount: 1 },
          { id: ALICE.toLowerCase(), address: ALICE, role: "bridge", inCount: 1, outCount: 1, transferCount: 2 },
          { id: TARGET.toLowerCase(), address: TARGET, role: "target", inCount: 1, outCount: 0, transferCount: 1 },
        ],
        edges: [
          { id: "a", from: CENTER, to: ALICE, count: 1, tokens: ["GAS"], txHashes: ["0x-a"] },
          { id: "b", from: ALICE, to: TARGET, count: 1, tokens: ["GAS"], txHashes: ["0x-b"] },
        ],
        summary: { transferCount: 2, pathDepth: 2, visitedCount: 2 },
      },
    }));
    const wrapper = mountRadar({ fetchPath });

    await wrapper.get('[data-testid="radar-mode-path"]').trigger("click");
    await wrapper.get('[data-testid="radar-target-input"]').setValue(TARGET);
    await wrapper.get('[data-testid="radar-path-form"]').trigger("submit");
    await flushPromises();

    expect(fetchPath).toHaveBeenCalledWith(expect.objectContaining({
      source: CENTER,
      target: TARGET,
      depth: 3,
      signal: expect.any(AbortSignal),
    }));
    expect(wrapper.get('[data-testid="asset-radar-path-status"]').text()).toContain(
      "addressDetail.radarPathFound",
    );
    expect(wrapper.findAll('[data-testid="asset-radar-node"]')).toHaveLength(3);
    expect(wrapper.text()).toContain("0x-a");
    expect(wrapper.text()).toContain("0x-b");
  });
});
