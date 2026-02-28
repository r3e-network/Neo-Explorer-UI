import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AddressTransactionsTab from "@/views/Account/components/AddressTransactionsTab.vue";

describe("AddressTransactionsTab", () => {
  it("renders OUT direction, recipient, and summary text value for transaction rows", () => {
    const currentAddress = "NcGtHcdmraBiRG9hBxwN7xk2M4W5sih2BGQ";
    const recipientAddress = "NQsv8QnzQjheCyKhx69jtGyAHzq1HEu8b9";
    const txHash = "0xf777f3a7e85e267ef8b0b674f125dfd0ab2d9f79dd8f03f98f8c9f9f209165df";

    const wrapper = mount(AddressTransactionsTab, {
      props: {
        address: currentAddress,
        transactions: [
          {
            hash: txHash,
            blockhash: "0xblock",
            blockindex: 8885902,
            blocktime: 1700000000,
            sender: currentAddress,
            to: recipientAddress,
            method: "GasToken: transfer",
            netfee: 253669,
            sysfee: 0,
            notifications: [],
          },
        ],
        transferSummaryByHash: {
          [txHash]: {
            text: "5.99746331 GAS",
            contract: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
            type: "NEP17",
          },
        },
        page: 1,
        totalPages: 1,
        pageSize: 10,
        totalCount: 1,
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a><slot /></a>",
          },
          HashLink: {
            name: "HashLink",
            props: ["hash"],
            template: "<span class='hash-link'>{{ hash }}</span>",
          },
          EtherscanPagination: true,
          Skeleton: true,
          ErrorState: true,
          EmptyState: true,
        },
      },
    });

    const text = wrapper.text();
    expect(text).toContain("OUT");
    expect(text).toContain("5.99746331 GAS");
    expect(text).toContain(recipientAddress);
    expect(text).not.toContain("SELF");
    expect(text).not.toContain("[object Object]");
  });
});
