import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";

import HashLink from "@/components/common/HashLink.vue";

const HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef";

const mountHashLink = (props = {}) =>
  mount(HashLink, {
    props,
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

describe("HashLink", () => {
  it("truncates hash by default", () => {
    const wrapper = mountHashLink({ hash: HASH, type: "tx" });
    expect(wrapper.text()).toContain("0x123456...abcdef");
  });

  it("shows full hash when truncated is false", () => {
    const wrapper = mountHashLink({ hash: HASH, type: "tx", truncated: false });
    expect(wrapper.text()).toContain(HASH);
  });

  it("supports legacy truncate prop alias", () => {
    const wrapper = mountHashLink({ hash: HASH, type: "tx", truncate: false });
    expect(wrapper.text()).toContain(HASH);
  });

  it("prefers legacy truncate prop over truncated when both are set", () => {
    const wrapper = mountHashLink({
      hash: HASH,
      type: "tx",
      truncate: true,
      truncated: false,
    });
    expect(wrapper.text()).toContain("0x123456...abcdef");
  });

  it("routes NEP-11 token links to nft detail route", () => {
    const wrapper = mountHashLink({
      hash: HASH,
      type: "token",
      tokenStandard: "NEP-11",
    });

    const linkStub = wrapper.findComponent({ name: "RouterLink" });
    expect(linkStub.props("to")).toBe(`/nft-token-info/${HASH}`);
  });

  it("hides copy button when copyable is false", () => {
    const wrapper = mountHashLink({ hash: HASH, type: "tx", copyable: false });
    expect(wrapper.findComponent({ name: "CopyButton" }).exists()).toBe(false);
  });

  it("applies standard link classes for focus and wrapping safety", () => {
    const wrapper = mountHashLink({ hash: HASH, type: "tx" });
    const link = wrapper.find("a");
    expect(link.classes()).toEqual(expect.arrayContaining(["etherscan-link", "font-hash", "break-all"]));
  });
});
