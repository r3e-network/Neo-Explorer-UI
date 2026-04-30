import { mount, config } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };

vi.mock("@/composables/useCommittee", () => ({
  useCommittee: () => ({
    resolvePrimaryIndex: vi.fn(() => 0),
    getPrimaryNodeName: vi.fn(() => "COZ"),
    getPrimaryNodeAddress: vi.fn(() => "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8"),
  }),
}));

vi.mock("@/components/common/HashLink.vue", () => ({
  default: {
    name: "HashLink",
    template: '<span data-testid="hash-link">COZ</span>',
  },
}));

vi.mock("@/utils/explorerFormat", () => ({
  formatNumber: (value) => value,
  formatAge: () => "just now",
  formatBytes: (value) => `${value} B`,
  formatGas: (value) => value,
}));

describe("BlockOverview", () => {
  it("renders the previous hash instead of the genesis fallback when prevhash exists", async () => {
    const BlockOverview = (await import("@/views/Block/components/BlockOverview.vue")).default;
    const wrapper = mount(BlockOverview, {
      props: {
        block: {
          index: 2,
          hash: "0xblock",
          prevhash: "0xprev",
          merkleroot: "0xmerkle",
          nextconsensus: "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8",
          timestamp: 1710000000,
          txcount: 0,
          size: 123,
          version: 0,
        },
        reward: 0,
        showWitnesses: false,
      },
      global: {
        stubs: {
          InfoRow: { template: "<div><slot /></div>" },
          RouterLink: { name: "RouterLink", template: '<a data-testid="previous-hash-link"><slot /></a>' },
        },
      },
    });

    expect(wrapper.text()).toContain("0xprev");
    expect(wrapper.text()).not.toContain("Genesis Block (no previous)");
    expect(wrapper.find('[data-testid="previous-hash-link"]').exists()).toBe(true);
  });

  it("does not duplicate validator names when the shared address link already resolves identity", async () => {
    const BlockOverview = (await import("@/views/Block/components/BlockOverview.vue")).default;
    const wrapper = mount(BlockOverview, {
      props: {
        block: {
          index: 1,
          hash: "0xblock",
          prevhash: "0xprev",
          merkleroot: "0xmerkle",
          nextconsensus: "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8",
          timestamp: 1710000000,
          txcount: 1,
          size: 123,
          version: 0,
        },
        reward: 0,
        showWitnesses: false,
      },
      global: {
        stubs: {
          InfoRow: { template: "<div><slot /></div>" },
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    const cozMatches = wrapper.text().match(/COZ/g) || [];
    expect(cozMatches).toHaveLength(3);
  });

  it("falls back to the fetched transaction list when aggregate block fees are zero", async () => {
    const BlockOverview = (await import("@/views/Block/components/BlockOverview.vue")).default;
    const wrapper = mount(BlockOverview, {
      props: {
        block: {
          index: 3,
          hash: "0xblock",
          prevhash: "0xprev",
          merkleroot: "0xmerkle",
          nextconsensus: "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8",
          timestamp: 1710000000,
          txcount: 2,
          sysfee: 0,
          netfee: 0,
          size: 123,
          version: 0,
        },
        transactions: [
          { sysfee: 100, netfee: 10 },
          { sysfee: 200, netfee: 20 },
        ],
        reward: 0,
        showWitnesses: false,
      },
      global: {
        stubs: {
          InfoRow: { template: "<div><slot /></div>" },
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    expect(wrapper.text()).toContain("300 GAS");
    expect(wrapper.text()).toContain("30 GAS");
  });

  it("treats string zero aggregate fees as missing and falls back to transaction fee aliases", async () => {
    const BlockOverview = (await import("@/views/Block/components/BlockOverview.vue")).default;
    const wrapper = mount(BlockOverview, {
      props: {
        block: {
          index: 4,
          hash: "0xblock",
          prevhash: "0xprev",
          merkleroot: "0xmerkle",
          nextconsensus: "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8",
          timestamp: 1710000000,
          txcount: 2,
          sysfee: "0",
          netfee: "0",
          size: 123,
          version: 0,
        },
        transactions: [
          { systemFee: "100", networkFee: "10" },
          { systemFee: "200", networkFee: "20" },
        ],
        reward: 0,
        showWitnesses: false,
      },
      global: {
        stubs: {
          InfoRow: { template: "<div><slot /></div>" },
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    expect(wrapper.text()).toContain("300 GAS");
    expect(wrapper.text()).toContain("30 GAS");
  });
});
