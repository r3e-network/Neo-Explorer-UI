import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import XHashLink from "@/components/common/XHashLink.vue";
import { NETWORK_CHANGE_EVENT } from "@/utils/env";

const RouterLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

afterEach(() => localStorage.clear());

describe("XHashLink", () => {
  it("prefers a curated official identity over a generic Blockscout name", () => {
    localStorage.setItem("neo_explorer_neox_network", "neox-mainnet");
    const wrapper = mount(XHashLink, {
      props: {
        hash: "0x1212000000000000000000000000000000000004",
        name: "ERC1967Proxy",
      },
      global: { stubs: { RouterLink: RouterLinkStub, CopyButton: true } },
    });

    expect(wrapper.text()).toContain("Neo X Bridge (TokenBridge)");
    expect(wrapper.text()).not.toContain("ERC1967Proxy");
  });

  it("re-resolves network-scoped identities after a Neo X network switch", async () => {
    localStorage.setItem("neo_explorer_neox_network", "neox-mainnet");
    const wrapper = mount(XHashLink, {
      props: { hash: "0x34a3b2aBB99B4C128acf61dCBBd1FcAC0B161652" },
      global: { stubs: { RouterLink: RouterLinkStub, CopyButton: true } },
    });
    expect(wrapper.text()).toContain("Stand-by Validator 1");

    window.dispatchEvent(new CustomEvent(NETWORK_CHANGE_EVENT, { detail: { neoxNet: "neox-testnet" } }));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain("Stand-by Validator 1");
    expect(wrapper.text()).toContain("0x34a3b2…1652");
  });
});
