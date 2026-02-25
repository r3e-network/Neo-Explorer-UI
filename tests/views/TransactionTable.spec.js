import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TransactionTable from "@/views/Transaction/components/TransactionTable.vue";
import { NEO_HASH } from "@/constants";

function reverseScriptHash(hash) {
  const body = String(hash || "").replace(/^0x/i, "");
  const pairs = body.match(/.{1,2}/g) || [];
  return `0x${pairs.reverse().join("")}`;
}

describe("TransactionTable address rendering", () => {
  it("renders From and To links in truncated mode", () => {
    const sender = "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW";
    const recipientContract = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";

    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            blockhash: "0x89abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567",
            blockindex: 123,
            blocktime: Date.now(),
            sender,
            notifications: [{ contract: recipientContract }],
            netfee: 0,
            sysfee: 0,
          },
        ],
        showAbsoluteTime: false,
        transferSummaryByHash: {},
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
            props: {
              hash: { type: String, default: "" },
              type: { type: String, default: "" },
              truncated: { type: Boolean, default: true },
            },
            template:
              '<span data-testid="hash-link" :data-hash="hash" :data-type="type" :data-truncated="String(truncated)"></span>',
          },
        },
      },
    });

    const senderLink = wrapper.find(`[data-testid="hash-link"][data-hash="${sender}"]`);
    expect(senderLink.exists()).toBe(true);
    expect(senderLink.attributes("data-truncated")).toBe("true");

    const recipientLink = wrapper.find(
      `[data-testid="hash-link"][data-hash="${recipientContract}"][data-type="contract"]`
    );
    expect(recipientLink.exists()).toBe(true);
    expect(recipientLink.attributes("data-truncated")).toBe("true");
  });

  it("normalizes reversed contract hashes before rendering recipient", () => {
    const reversedHash = reverseScriptHash(NEO_HASH);

    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            blockhash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            blockindex: 124,
            blocktime: Date.now(),
            sender: "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW",
            notifications: [{ contract: reversedHash }],
            netfee: 0,
            sysfee: 0,
          },
        ],
        showAbsoluteTime: false,
        transferSummaryByHash: {},
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
            props: {
              hash: { type: String, default: "" },
              type: { type: String, default: "" },
              truncated: { type: Boolean, default: true },
            },
            template:
              '<span data-testid="hash-link" :data-hash="hash" :data-type="type" :data-truncated="String(truncated)"></span>',
          },
        },
      },
    });

    const recipientLink = wrapper.find(`[data-testid="hash-link"][data-type="contract"]`);
    expect(recipientLink.exists()).toBe(true);
    expect(recipientLink.attributes("data-hash")).toBe(NEO_HASH);
  });

  it("renders VM state badges as HALT / FAULT / UNKNOWN", () => {
    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: "0x1",
            blockhash: "0xb1",
            blockindex: 1,
            blocktime: Date.now(),
            sender: "NQf8xK1nmyQj3X5Y2P4H5n6j6S8s7w6Q4s",
            vmstate: "HALT",
            netfee: 0,
            sysfee: 0,
          },
          {
            hash: "0x2",
            blockhash: "0xb2",
            blockindex: 2,
            blocktime: Date.now(),
            sender: "NQf8xK1nmyQj3X5Y2P4H5n6j6S8s7w6Q4t",
            vmstate: "FAULT",
            netfee: 0,
            sysfee: 0,
          },
          {
            hash: "0x3",
            blockhash: "0xb3",
            blockindex: 3,
            blocktime: Date.now(),
            sender: "NQf8xK1nmyQj3X5Y2P4H5n6j6S8s7w6Q4u",
            netfee: 0,
            sysfee: 0,
          },
        ],
        showAbsoluteTime: false,
        transferSummaryByHash: {},
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
            props: {
              hash: { type: String, default: "" },
              type: { type: String, default: "" },
              truncated: { type: Boolean, default: true },
            },
            template:
              '<span data-testid="hash-link" :data-hash="hash" :data-type="type" :data-truncated="String(truncated)"></span>',
          },
        },
      },
    });

    const labels = wrapper.findAll("span").map((node) => node.text());
    expect(labels).toContain("HALT");
    expect(labels).toContain("FAULT");
    expect(labels).toContain("UNKNOWN");
  });
});
