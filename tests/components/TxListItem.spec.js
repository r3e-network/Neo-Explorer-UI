import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TxListItem from "@/components/common/TxListItem.vue";
import { NEO_HASH } from "@/constants";

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
