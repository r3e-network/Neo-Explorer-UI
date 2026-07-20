import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import xHomeSource from "@/views/X/XHome.vue?raw";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

const hashLinkStub = {
  props: ["hash", "name", "label"],
  template: '<span data-testid="hash-link">{{ name || label || hash }}</span>',
};

describe("Neo X home list rows", () => {
  it("keeps the paired home lists on the same rolling six-row baseline", () => {
    expect(xHomeSource).toContain("const LATEST_ROWS = NEOX_HOME_FEED_ROWS");
    expect(xHomeSource).toContain("grid items-stretch gap-4 xl:grid-cols-2");
    expect(xHomeSource.match(/relative grid flex-1 grid-rows-6 overflow-hidden/g)).toHaveLength(2);
  });

  it("shows block economics and utilization alongside core block data", async () => {
    const XBlockListItem = (await import("@/views/X/components/XBlockListItem.vue")).default;
    const wrapper = mount(XBlockListItem, {
      props: {
        block: {
          index: 7_152_524,
          timestampMs: Date.now() - 3_000,
          miner: "0x1212000000000000000000000000000000000003",
          primaryValidator: "0x34a3b2abb99b4c128acf61dcbbd1fcac0b161652",
          primaryPosition: 2,
          consensusSize: 7,
          txCount: 12,
          size: 1_024,
          transactionFees: "1234000000000000",
          baseFeePerGas: "20000000000",
          gasUsedPercentage: 42.5,
        },
      },
      global: { stubs: { XHashLink: hashLinkStub } },
    });

    expect(wrapper.text()).toContain("#7,152,524");
    expect(wrapper.text()).toContain("Primary Validator");
    expect(wrapper.text()).toContain("0x34a3b2abb99b4c128acf61dcbbd1fcac0b161652");
    expect(wrapper.text()).toContain("#2/7");
    expect(wrapper.text()).not.toContain("Governance Reward");
    expect(wrapper.text()).toContain("Transaction Fees");
    expect(wrapper.text()).toContain("0.001234 GAS");
    expect(wrapper.text()).toContain("Base Fee 20 Gwei");
    expect(wrapper.text()).toContain("Gas Used 42.50%");
    expect(wrapper.text()).toContain("12 txns");
    expect(wrapper.classes()).toContain("h-full");
  });

  it("shows both transaction value and fee plus block context", async () => {
    const XTxListItem = (await import("@/views/X/components/XTxListItem.vue")).default;
    const wrapper = mount(XTxListItem, {
      props: {
        tx: {
          hash: "0x1234",
          timestampMs: Date.now() - 4_000,
          sender: "0xfrom",
          to: "0xto",
          method: "verifyOracleProofV2",
          status: "ok",
          blockIndex: 7_152_524,
          confirmations: 33,
          value: "1000000000000000000",
          fee: "1824624000000000",
        },
      },
      global: { stubs: { XHashLink: hashLinkStub } },
    });

    expect(wrapper.text()).toContain("verifyOracleProofV2");
    expect(wrapper.text()).toContain("#7,152,524 · 33 conf");
    expect(wrapper.text()).toContain("Value 1 GAS");
    expect(wrapper.text()).toContain("Fee 0.001824 GAS");
    expect(wrapper.text()).toContain("Success");
    expect(wrapper.classes()).toContain("h-full");
  });

  it("labels unresolved four-byte methods as selectors instead of hash suffixes", async () => {
    const XTxListItem = (await import("@/views/X/components/XTxListItem.vue")).default;
    const wrapper = mount(XTxListItem, {
      props: {
        tx: {
          hash: "0x1234",
          method: "0x3161b7f6",
          timestampMs: Date.now(),
          status: "ok",
        },
      },
      global: { stubs: { XHashLink: hashLinkStub } },
    });

    expect(wrapper.text()).toContain("Selector 0x3161b7f6");
    expect(wrapper.text()).not.toContain("Method 0x3161b7f6");
  });

  it("surfaces Anti-MEV Envelope semantics instead of the reserved selector", async () => {
    const XTxListItem = (await import("@/views/X/components/XTxListItem.vue")).default;
    const wrapper = mount(XTxListItem, {
      props: {
        tx: {
          hash: "0x1234",
          method: "0xffffffff",
          timestampMs: Date.now(),
          status: "ok",
          antiMev: { isStructurallyValid: true, dkgRound: 17 },
        },
      },
      global: { stubs: { XHashLink: hashLinkStub } },
    });

    expect(wrapper.text()).toContain("Anti-MEV Envelope");
    expect(wrapper.text()).not.toContain("Selector 0xffffffff");
  });
});
