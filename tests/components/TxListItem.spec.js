import { mount, config } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import TxListItem from "@/components/common/TxListItem.vue";

// Make `$t(key)` resolve to the key in template, matching the useI18n mock above.
config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };
import { NEO_HASH } from "@/constants";
import { scriptHashToAddress } from "@/utils/neoHelpers";

const useNowMock = vi.hoisted(() => vi.fn(() => ({ value: new Date() })));

vi.mock("@vueuse/core", () => ({
  useNow: useNowMock,
}));

vi.mock("vue-i18n", async () => {
  const actual = await vi.importActual("vue-i18n");
  return {
    ...actual,
    useI18n: () => ({ t: (k) => k, locale: { value: "en" } }),
  };
});

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

vi.mock("@/utils/healthCheck", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
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
  it("updates relative ages every second", () => {
    mount(TxListItem, {
      props: {
        tx: {
          hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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

    expect(useNowMock).toHaveBeenCalledWith({ interval: 1000 });
  });

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

  it("renders Morpheus sender alias and collapses duplicated NNS recipient labels", async () => {
    const contractHash = "0x03013f49c42a14546c8bbe58f9d434c3517fccab";
    const contractAddress = scriptHashToAddress(contractHash);
    getAddressTag.mockImplementation(async (address) => {
      if (address === contractHash || address === contractAddress) {
        return {
          address,
          nns_domain: "pricefeed.morpheus.neopricefeed.morpheus.neo",
          nns_expiration_ms: Date.now() + 60_000,
        };
      }
      return null;
    });

    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x5f21212121212121212121212121212121212121212121212121212121a8a3",
          blocktime: Date.now(),
          sender: "0x6d0656f6dd91469db1c90cc1e574380613f43738",
          netfee: 0,
          sysfee: 0,
        },
        transferSummary: {
          text: "1 OracleResponse",
          contract: contractHash,
          type: "NEP17",
          targetCount: 1,
          recipient: contractHash,
          recipientType: "address",
          singleTarget: true,
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

    await Promise.resolve();
    await Promise.resolve();

    const text = wrapper.text();
    expect(text).toContain("MorpheusOracle");
    expect(text).toContain("pricefeed.morpheus.neo");
    expect(text).not.toContain("pricefeed.morpheus.neopricefeed.morpheus.neo");
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

  it("prefers known recipient address over Neo/GAS contract for multi-target summaries", () => {
    const targetAddress = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x5656565656565656565656565656565656565656565656565656565656565656",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          contractHash: reverseScriptHash(NEO_HASH),
          netfee: 0,
          sysfee: 0,
        },
        transferSummary: {
          text: "3 transfers",
          contract: reverseScriptHash(NEO_HASH),
          type: "NEP17",
          targetCount: 3,
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
    expect(flowNode.find('img').exists()).toBe(true);
  });

  it("uses the single-transfer flow only for one target address", () => {
    const txHash = "0x8888888888888888888888888888888888888888888888888888888888888888";
    const targetAddress = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: txHash,
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          netfee: 0,
          sysfee: 0,
        },
        transferSummary: {
          text: "3 transfers",
          contract: reverseScriptHash(NEO_HASH),
          type: "NEP17",
          targetCount: 3,
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

    expect(wrapper.find('[data-testid="single-transfer-flow"]').exists()).toBe(false);
  });

  it("passes addressAliasAsPrimary to sender and recipient address links", () => {
    const senderAddress = "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc";
    const targetAddress = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";

    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x7777777777777777777777777777777777777777777777777777777777777777",
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
              addressAliasAsPrimary: { type: Boolean, default: false },
            },
            template:
              '<span data-testid="hash-link" :data-hash="hash" :data-type="type" :data-primary="String(addressAliasAsPrimary)"></span>',
          },
        },
      },
    });

    const senderLink = wrapper.find(
      `[data-testid="hash-link"][data-hash="${senderAddress}"][data-type="address"]`
    );
    const recipientLink = wrapper.find(
      `[data-testid="hash-link"][data-hash="${targetAddress}"][data-type="address"]`
    );

    expect(senderLink.exists()).toBe(true);
    expect(recipientLink.exists()).toBe(true);
    expect(senderLink.attributes("data-primary")).toBe("true");
    expect(recipientLink.attributes("data-primary")).toBe("true");
  });

  it("uses the GasToken token logo for native-token method badges", () => {
    const wrapper = mount(TxListItem, {
      props: {
        tx: {
          hash: "0x9999999999999999999999999999999999999999999999999999999999999999",
          blocktime: Date.now(),
          sender: "NMBAoPYQW15f9qxr7WiQd3rNnQJYX4Wwwc",
          method: "GasToken: transfer",
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

    const logo = wrapper.find('img[alt="GAS"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("https://s2.coinmarketcap.com/static/img/coins/64x64/1785.png");
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
