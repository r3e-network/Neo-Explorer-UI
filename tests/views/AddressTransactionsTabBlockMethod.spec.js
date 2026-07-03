import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

// #10fe: Address Transactions tab must link the Block column by height and
// must not mislabel every row 'Transfer'. These are component-level render
// assertions against the row shape AddressDetail.vue now produces (block_index
// carried through, blockhash seeded from the height so the existing
// blockhash-gated link fires, and script passed through for method decode).

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key, params) => {
      if (params && typeof params === "object") {
        return Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(new RegExp(`{${k}}`, "g"), String(v)),
          key,
        );
      }
      return key;
    };
  },
};

const RouterLinkStub = {
  props: ["to"],
  template: '<a :href="typeof to === \'string\' ? to : (to?.path || \'\')"><slot /></a>',
};

async function mountTab(transactions) {
  const AddressTransactionsTab = (
    await import("@/views/Account/components/AddressTransactionsTab.vue")
  ).default;
  return mount(AddressTransactionsTab, {
    props: {
      address: "NsenderAddr000000000000000000000000",
      transactions,
      loading: false,
      error: "",
      page: 1,
      totalPages: 1,
      pageSize: 10,
      totalCount: transactions.length,
    },
    global: {
      plugins: [i18nPlugin],
      stubs: {
        "router-link": RouterLinkStub,
        RouterLink: RouterLinkStub,
        HashLink: { props: ["hash", "type"], template: "<span>{{ hash }}</span>" },
        EtherscanPagination: true,
        Skeleton: true,
        ErrorState: true,
        EmptyState: true,
      },
    },
  });
}

describe("AddressTransactionsTab Block link + Method label (#10fe)", () => {
  it("links the Block column to /block-info/{height} for a height-seeded row", async () => {
    // AddressDetail seeds blockhash from the height when a real hash is absent
    // so the existing blockhash-gated link fires; the label is the height.
    const wrapper = await mountTab([
      {
        hash: "0x" + "1".repeat(64),
        blockhash: "4242",
        blockIndex: 4242,
        blocktime: 1_700_000_000_000,
        sender: "Nsender",
        method: "",
        script: "",
      },
    ]);

    const blockLink = wrapper
      .findAll("a")
      .find((a) => (a.attributes("href") || "").includes("/block-info/4242"));
    expect(blockLink).toBeTruthy();
    expect(blockLink.text()).toContain("4,242");
    wrapper.unmount();
  });

  it("does not label a contract invocation 'Transfer' when a method is known", async () => {
    // When the row carries an explicit method (e.g. decoded from script), the
    // label must use it — not the hardcoded 'Transfer' fallback.
    const wrapper = await mountTab([
      {
        hash: "0x" + "2".repeat(64),
        blockhash: "88",
        blockIndex: 88,
        blocktime: 1_700_000_000_000,
        sender: "Nsender",
        method: "mint",
        script: "",
      },
    ]);

    const methodBadge = wrapper.find(".badge-soft");
    expect(methodBadge.exists()).toBe(true);
    expect(methodBadge.text()).toBe("mint");
    expect(methodBadge.text()).not.toBe("Transfer");
    wrapper.unmount();
  });

  it("still shows '-' for the Block column when neither height nor hash is present", async () => {
    const wrapper = await mountTab([
      {
        hash: "0x" + "3".repeat(64),
        blockhash: "",
        blockIndex: null,
        blocktime: 1_700_000_000_000,
        sender: "Nsender",
        method: "",
        script: "",
      },
    ]);

    // No /block-info link rendered for this row.
    const blockLink = wrapper
      .findAll("a")
      .find((a) => (a.attributes("href") || "").includes("/block-info/"));
    expect(blockLink).toBeFalsy();
    wrapper.unmount();
  });
});
