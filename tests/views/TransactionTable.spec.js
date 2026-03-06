import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import TransactionTable from "@/views/Transaction/components/TransactionTable.vue";
import { NEO_HASH } from "@/constants";

const { getContractMetadataBatch } = vi.hoisted(() => ({
  getContractMetadataBatch: vi.fn(async () => ({})),
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadataBatch,
  },
}));

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

  it("uses the NeoToken token logo for native-token method badges", () => {
    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: "0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed",
            blockhash: "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcab",
            blockindex: 125,
            blocktime: Date.now(),
            sender: "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW",
            method: "NeoToken: transfer",
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

    const logo = wrapper.find('img[alt="NEO"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("https://s2.coinmarketcap.com/static/img/coins/64x64/1376.png");
  });

  it("does not show native-token badges for non-token Neo-prefixed contract names", () => {
    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: "0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddead",
            blockhash: "0xdefdefdefdefdefdefdefdefdefdefdefdefdefdefdefdefdefdefdefdefdefd",
            blockindex: 126,
            blocktime: Date.now(),
            sender: "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW",
            method: "NeoXBridge: lock",
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

    expect(wrapper.find('img[alt="NEO"]').exists()).toBe(false);
    expect(wrapper.find('img[alt="GAS"]').exists()).toBe(false);
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

  it("accepts Vmstate field casing from backend payloads", () => {
    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: "0x4",
            blockhash: "0xb4",
            blockindex: 4,
            blocktime: Date.now(),
            sender: "NQf8xK1nmyQj3X5Y2P4H5n6j6S8s7w6Q4v",
            Vmstate: "FAULT",
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
    expect(labels).toContain("FAULT");
    expect(labels).not.toContain("HALT");
  });

  it("prefers single-target transfer recipient address over contract recipient", () => {
    const txHash = "0x9";
    const targetAddress = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: txHash,
            blockhash: "0xb9",
            blockindex: 9,
            blocktime: Date.now(),
            sender: "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW",
            contractHash: reverseScriptHash(NEO_HASH),
            netfee: 0,
            sysfee: 0,
          },
        ],
        showAbsoluteTime: false,
        transferSummaryByHash: {
          [txHash]: {
            text: "1 NEO",
            contract: reverseScriptHash(NEO_HASH),
            type: "NEP17",
            targetCount: 1,
            recipient: targetAddress,
            recipientType: "address",
          },
        },
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

    const recipientLink = wrapper.find(
      `[data-testid="hash-link"][data-hash="${targetAddress}"][data-type="address"]`
    );
    expect(recipientLink.exists()).toBe(true);
  });

  it("prefers known recipient address over Neo/GAS contract for multi-target summaries", () => {
    const txHash = "0x9a";
    const targetAddress = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: txHash,
            blockhash: "0xb9a",
            blockindex: 10,
            blocktime: Date.now(),
            sender: "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW",
            contractHash: reverseScriptHash(NEO_HASH),
            netfee: 0,
            sysfee: 0,
          },
        ],
        showAbsoluteTime: false,
        transferSummaryByHash: {
          [txHash]: {
            text: "3 transfers",
            contract: reverseScriptHash(NEO_HASH),
            type: "NEP17",
            targetCount: 3,
            recipient: targetAddress,
            recipientType: "address",
          },
        },
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

    const recipientLink = wrapper.find(
      `[data-testid="hash-link"][data-hash="${targetAddress}"][data-type="address"]`
    );
    expect(recipientLink.exists()).toBe(true);
  });

  it("passes addressAliasAsPrimary to sender and recipient address links", () => {
    const sender = "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW";
    const recipient = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    const wrapper = mount(TransactionTable, {
      props: {
        transactions: [
          {
            hash: "0xa1",
            blockhash: "0xba",
            blockindex: 321,
            blocktime: Date.now(),
            sender,
            to: recipient,
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
              addressAliasAsPrimary: { type: Boolean, default: false },
            },
            template:
              '<span data-testid="hash-link" :data-hash="hash" :data-type="type" :data-primary="String(addressAliasAsPrimary)" :data-truncated="String(truncated)"></span>',
          },
        },
      },
    });

    const senderLink = wrapper.find(`[data-testid="hash-link"][data-hash="${sender}"][data-type="address"]`);
    const recipientLink = wrapper.find(
      `[data-testid="hash-link"][data-hash="${recipient}"][data-type="address"]`
    );
    expect(senderLink.exists()).toBe(true);
    expect(recipientLink.exists()).toBe(true);
    expect(senderLink.attributes("data-primary")).toBe("true");
    expect(recipientLink.attributes("data-primary")).toBe("true");
  });
});
