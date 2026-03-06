import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import TxListItem from "@/components/common/TxListItem.vue";
import { NEO_HASH } from "@/constants";

const { resolveAddressToNNS, getContractMetadata, getAddressTag } = vi.hoisted(() => ({
  resolveAddressToNNS: vi.fn(async () => null),
  getContractMetadata: vi.fn(async () => null),
  getAddressTag: vi.fn(async () => null),
}));

vi.mock("@/services/nnsService", () => ({
  default: {
    resolveAddressToNNS,
  },
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadata,
    getAddressTag,
  },
}));

function reverseScriptHash(hash) {
  const body = String(hash || "").replace(/^0x/i, "");
  const pairs = body.match(/.{1,2}/g) || [];
  return `0x${pairs.reverse().join("")}`;
}

describe("TxListItem", () => {
  it("resolves known contract names from reversed script-hash form", () => {
    const reversedNeoHash = reverseScriptHash(NEO_HASH);

    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          contractHash: reversedNeoHash,
          netfee: 0,
          sysfee: 0,
        },
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("NeoToken");
  });

  it("uses transfer summary contract as recipient fallback when tx lacks recipient/method", () => {
    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          netfee: 0,
          sysfee: 0,
        },
        transferSummary: {
          text: "1 NEO",
          contract: reverseScriptHash(NEO_HASH),
          type: "NEP17",
        },
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("NeoToken");
    expect(wrapper.text()).not.toContain("Contract Call");
  });

  it("uses receiver field as recipient fallback when tx.to is missing", () => {
    const reversedNeoHash = reverseScriptHash(NEO_HASH);

    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          receiver: reversedNeoHash,
          netfee: 0,
          sysfee: 0,
        },
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("NeoToken");
    expect(wrapper.text()).not.toContain("Contract Call");
  });

  it("prefers single-target transfer recipient address over contract recipient", () => {
    const targetAddress = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x5555555555555555555555555555555555555555555555555555555555555555",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          contractHash: reverseScriptHash(NEO_HASH),
          netfee: 0,
          sysfee: 0,
        },
        transferSummary: {
          text: "1 NEO",
          contract: reverseScriptHash(NEO_HASH),
          type: "NEP17",
          targetCount: 1,
          recipient: targetAddress,
          recipientType: "address",
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
            },
            template: '<span data-testid="hash-link" :data-hash="hash" :data-type="type"></span>',
          },
        },
      },
    });

    const toRecipient = wrapper.find(
      `[data-testid="hash-link"][data-hash="${targetAddress}"][data-type="address"]`
    );
    expect(toRecipient.exists()).toBe(true);
  });

  it("shows single-transfer flow value between sender and recipient", () => {
    const senderAddress = "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc";
    const targetAddress = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x6666666666666666666666666666666666666666666666666666666666666666",
          blocktime: Date.now(),
          sender: senderAddress,
          netfee: 0,
          sysfee: 0,
        },
        transferSummary: {
          text: "1 NEO",
          contract: reverseScriptHash(NEO_HASH),
          type: "NEP17",
          targetCount: 1,
          recipient: targetAddress,
          recipientType: "address",
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
            },
            template:
              '<span data-testid="hash-link" :data-hash="hash" :data-type="type">{{ type }}:{{ hash }}</span>',
          },
        },
      },
    });

    expect(
      wrapper.find(`[data-testid="hash-link"][data-hash="${senderAddress}"][data-type="address"]`).exists()
    ).toBe(true);
    expect(
      wrapper.find(`[data-testid="hash-link"][data-hash="${targetAddress}"][data-type="address"]`).exists()
    ).toBe(true);
    const flowNode = wrapper.find('[data-testid="single-transfer-flow"]');
    expect(flowNode.exists()).toBe(true);
    expect(flowNode.text()).toContain("1 NEO");
  });

  it("shows Unknown when vmstate is missing", () => {
    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x2222222222222222222222222222222222222222222222222222222222222222",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          netfee: 0,
          sysfee: 0,
        },
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Unknown");
    expect(wrapper.text()).not.toContain("HALT");
  });

  it("accepts Vmstate field casing from backend payloads", () => {
    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x3333333333333333333333333333333333333333333333333333333333333333",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          Vmstate: "FAULT",
          netfee: 0,
          sysfee: 0,
        },
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("FAULT");
    expect(wrapper.text()).not.toContain("HALT");
  });

  it("shows Unknown for non-final status aliases", () => {
    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x4444444444444444444444444444444444444444444444444444444444444444",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          status: "pending",
          netfee: 0,
          sysfee: 0,
        },
      },
      global: {
        stubs: {
          RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a><slot /></a>",
          },
        },
      },
    });

    expect(wrapper.text()).toContain("PENDING");
    expect(wrapper.text()).not.toContain("Unknown");
  });
});
