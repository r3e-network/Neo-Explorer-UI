import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolveAddressToNNS, getByHash, getContractMetadata } = vi.hoisted(() => ({
  resolveAddressToNNS: vi.fn(async () => null),
  getByHash: vi.fn(async () => null),
  getContractMetadata: vi.fn(async () => null),
}));

const UNKNOWN_ADDRESS = "Naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

vi.mock("@/services/nnsService", () => ({
  default: {
    resolveAddressToNNS,
  },
}));

vi.mock("@/services", () => ({
  contractService: {
    getByHash,
  }
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadata,
  },
}));

import HashLink from "@/components/common/HashLink.vue";

const HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef";
const COZ_SCRIPT_HASH = "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8";
const COZ_ADDRESS = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    expect(link.classes()).toEqual(expect.arrayContaining(["etherscan-link", "font-hash", "truncate", "text-sm"]));
  });

  it("skips NNS resolution when resolveNns is false", async () => {
    mountHashLink({
      hash: UNKNOWN_ADDRESS,
      type: "address",
      resolveNns: false,
    });

    await flushPromises();
    expect(resolveAddressToNNS).not.toHaveBeenCalled();
  });

  it("resolves NNS for address links by default", async () => {
    mountHashLink({
      hash: UNKNOWN_ADDRESS,
      type: "address",
    });

    await flushPromises();
    expect(resolveAddressToNNS).toHaveBeenCalledWith(UNKNOWN_ADDRESS);
  });

  it("dynamically resolves missing contract names and falls back to reverse-endian", async () => {
    // Return null for normal endian, return mock for reverse-endian
    getByHash.mockImplementation(async (hash) => {
      if (hash === "0x11223344") return null;
      if (hash === "0x44332211") return { name: "ReverseEndianContract" };
      return null;
    });

    const wrapper = mountHashLink({
      hash: "0x11223344",
      type: "contract",
    });

    await flushPromises();
    expect(getByHash).toHaveBeenCalledTimes(2);
    expect(getByHash).toHaveBeenNthCalledWith(1, "0x11223344");
    expect(getByHash).toHaveBeenNthCalledWith(2, "0x44332211");
    expect(wrapper.text()).toContain("ReverseEndianContract");
  });

  it("shows known address name when hash is a known script hash", async () => {
    const wrapper = mountHashLink({
      hash: COZ_SCRIPT_HASH,
      type: "address",
      resolveNns: false,
    });

    await flushPromises();
    expect(wrapper.text()).toContain("COZ");
  });

  it("routes known script-hash addresses to canonical account address", async () => {
    const wrapper = mountHashLink({
      hash: COZ_SCRIPT_HASH,
      type: "address",
      resolveNns: false,
    });

    await flushPromises();
    const linkStub = wrapper.findComponent({ name: "RouterLink" });
    expect(linkStub.props("to")).toBe(`/account-profile/${COZ_ADDRESS}`);
  });
});
