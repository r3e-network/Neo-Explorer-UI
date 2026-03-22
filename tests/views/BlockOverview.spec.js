import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

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
});
