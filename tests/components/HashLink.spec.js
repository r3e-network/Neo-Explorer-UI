import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GAS_HASH, NEO_HASH } from "@/constants";
import { scriptHashToAddress } from "@/utils/neoHelpers";

const { resolveAddressToNNS, getByHash, getByHashWithFallback, getContractMetadata, getAddressTag, getValidatorMetadata } = vi.hoisted(() => ({
  resolveAddressToNNS: vi.fn(async () => null),
  getByHash: vi.fn(async () => null),
  getByHashWithFallback: vi.fn(async () => null),
  getContractMetadata: vi.fn(async () => null),
  getAddressTag: vi.fn(async () => null),
  getValidatorMetadata: vi.fn(async () => []),
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
    getByHashWithFallback,
  }
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadata,
    getAddressTag,
    getValidatorMetadata,
  },
}));

import HashLink from "@/components/common/HashLink.vue";

const HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef";
const COZ_SCRIPT_HASH = "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8";
const COZ_ADDRESS = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
const BINANCE_ADDRESS = "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp";
const EVERSTAKE_ADDRESS = "NZ9rkPKcDQqH6bffyYqU6yd5A2cUvuDLUw";

const mountHashLink = (props = {}) =>
  mount(HashLink, {
    props,
    global: {
      mocks: { $t: (k) => k },
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

  it("resolves NNS for contract links and prefers the domain label", async () => {
    getAddressTag.mockResolvedValueOnce({
      nns_domain: "oracle.morpheus.neo",
      nns_expiration_ms: Date.now() + 60_000,
    });
    getContractMetadata.mockResolvedValueOnce({
      display_name: "Morpheus Oracle",
    });

    const wrapper = mountHashLink({
      hash: "0x017520f068fd602082fe5572596185e62a4ad991",
      type: "contract",
    });

    await flushPromises();

    expect(wrapper.text()).toContain("oracle.morpheus.neo");
    expect(wrapper.text()).not.toContain("Morpheus Oracle");
  });

  it("dynamically resolves missing contract names and falls back to reverse-endian", async () => {
    const contractHash = "0x1122334411223344112233441122334411223344";
    const reversedHash = "0x4433221144332211443322114433221144332211";

    getContractMetadata.mockImplementation(async (hash) => {
      if (hash === contractHash) return null;
      if (hash === reversedHash) return { display_name: "ReverseEndianContract" };
      return null;
    });

    const wrapper = mountHashLink({
      hash: contractHash,
      type: "contract",
      resolveNns: false,
    });

    await flushPromises();
    await flushPromises();
    expect(wrapper.text()).toContain("ReverseEndianContract");
  });

  it("falls back to native contract state names when indexed contract rows are missing", async () => {
    const contractHash = "0x03013f49c42a14546c8bbe58f9d434c3517fccab";
    getContractMetadata.mockResolvedValueOnce(null);
    getContractMetadata.mockResolvedValueOnce(null);
    getByHash.mockResolvedValueOnce(null);
    getByHashWithFallback.mockResolvedValueOnce({
      hash: contractHash,
      name: "MorpheusDataFeed",
    });

    const wrapper = mountHashLink({
      hash: contractHash,
      type: "contract",
      resolveNns: false,
    });

    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).toContain("MorpheusDataFeed");
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

  it("ignores metadata aliases that only repeat the same script hash", async () => {
    getAddressTag.mockResolvedValueOnce({
      address: "0x6d0656f6dd91469db1c90cc1e574380613f43738",
      display_name: "0x6d0656f6dd91469db1c90cc1e574380613f43738",
    });

    const wrapper = mountHashLink({
      hash: "0x6d0656f6dd91469db1c90cc1e574380613f43738",
      type: "address",
      resolveNns: false,
    });

    await flushPromises();
    expect(wrapper.text()).toContain("MorpheusOracle");
    expect(wrapper.text()).not.toContain("0x6d0656f6dd91469db1c90cc1e574380613f43738");
  });

  it("shows known address name for Morpheus sender script hash", async () => {
    const wrapper = mountHashLink({
      hash: "0x6d0656f6dd91469db1c90cc1e574380613f43738",
      type: "address",
      resolveNns: false,
    });

    await flushPromises();
    expect(wrapper.text()).toContain("MorpheusOracle");
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

  it("shows Binance label for configured known Binance address", async () => {
    const wrapper = mountHashLink({
      hash: BINANCE_ADDRESS,
      type: "address",
      resolveNns: false,
    });

    await flushPromises();
    expect(wrapper.text()).toContain("Binance");
  });

  it("shows known address name as primary link when addressAliasAsPrimary is true", async () => {
    getAddressTag.mockResolvedValueOnce({
      address: BINANCE_ADDRESS,
      logo_url: "https://example.com/binance-logo.png",
    });

    const wrapper = mountHashLink({
      hash: BINANCE_ADDRESS,
      type: "address",
      resolveNns: false,
      addressAliasAsPrimary: true,
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Binance");
    expect(wrapper.text()).not.toContain("NUqLhf1");
    const logo = wrapper.find('img[alt="Binance"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("/img/known/binance.svg");
  });

  it("falls back to known address logo when metadata logo is missing", async () => {
    getAddressTag.mockResolvedValueOnce(null);

    const wrapper = mountHashLink({
      hash: BINANCE_ADDRESS,
      type: "address",
      resolveNns: false,
      addressAliasAsPrimary: true,
    });

    await flushPromises();

    const logo = wrapper.find('img[alt="Binance"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("/img/known/binance.svg");
  });

  it("shows candidate logo for known validator addresses when address tags lack one", async () => {
    getAddressTag.mockResolvedValueOnce(null);
    getValidatorMetadata.mockResolvedValueOnce([
      {
        scripthash: EVERSTAKE_ADDRESS,
        logo_url: "https://example.com/everstake.png",
      },
    ]);

    const wrapper = mountHashLink({
      hash: EVERSTAKE_ADDRESS,
      type: "address",
      resolveNns: false,
      addressAliasAsPrimary: true,
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Everstake");
    const logo = wrapper.find('img[alt="Everstake"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("https://example.com/everstake.png");
  });

  it("uses validator metadata names as primary address labels by default", async () => {
    getAddressTag.mockResolvedValueOnce(null);
    getValidatorMetadata.mockResolvedValueOnce([
      {
        address: UNKNOWN_ADDRESS,
        display_name: "Validator Alpha",
        logo_url: "https://example.com/validator-alpha.png",
      },
    ]);

    const wrapper = mountHashLink({
      hash: UNKNOWN_ADDRESS,
      type: "address",
      resolveNns: false,
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Validator Alpha");
    expect(wrapper.text()).not.toContain("Naaaaaaaa");
    const logo = wrapper.find('img[alt="Validator Alpha"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("https://example.com/validator-alpha.png");
  });

  it("uses known contract names and logos for contract addresses rendered as address links", async () => {
    const neoTokenAddress = scriptHashToAddress(NEO_HASH);

    const wrapper = mountHashLink({
      hash: neoTokenAddress,
      type: "address",
      resolveNns: false,
    });

    await flushPromises();

    expect(wrapper.text()).toContain("NeoToken");
    const logo = wrapper.find('img[alt="NeoToken"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("https://s2.coinmarketcap.com/static/img/coins/64x64/1376.png");
  });

  it("uses token logos for NeoToken and GasToken contract hashes", async () => {
    const neoWrapper = mountHashLink({
      hash: NEO_HASH,
      type: "contract",
    });
    const gasWrapper = mountHashLink({
      hash: GAS_HASH,
      type: "contract",
    });

    await flushPromises();

    const neoLogo = neoWrapper.find("img");
    const gasLogo = gasWrapper.find("img");
    expect(neoLogo.exists()).toBe(true);
    expect(gasLogo.exists()).toBe(true);
    expect(neoLogo.attributes("src")).toBe("https://s2.coinmarketcap.com/static/img/coins/64x64/1376.png");
    expect(gasLogo.attributes("src")).toBe("https://s2.coinmarketcap.com/static/img/coins/64x64/1785.png");
  });

  it("prefers active domain alias from address metadata and shows address logo", async () => {
    const logo = "https://example.com/domain-logo.png";
    getAddressTag.mockResolvedValueOnce({
      address: UNKNOWN_ADDRESS,
      nns_domain: "alice.neo",
      has_active_nns: true,
      nns_expiration_ms: Date.now() + 60_000,
      logo_url: logo,
    });

    const wrapper = mountHashLink({
      hash: UNKNOWN_ADDRESS,
      type: "address",
      resolveNns: true,
    });

    await flushPromises();

    expect(wrapper.text()).toContain("alice.neo");
    const aliasLogo = wrapper.find('img[alt="alice.neo"]');
    expect(aliasLogo.exists()).toBe(true);
    expect(aliasLogo.attributes("src")).toBe(logo);
  });

  it("routes address chat actions to the internal chat page instead of external NeoChat", async () => {
    const wrapper = mountHashLink({
      hash: COZ_ADDRESS,
      type: "address",
      resolveNns: false,
      showNeoChat: true,
    });

    await flushPromises();

    const links = wrapper.findAllComponents({ name: "RouterLink" });
    expect(links.length).toBeGreaterThan(1);
    const chatLink = links[links.length - 1];
    expect(chatLink.props("to")).toEqual({
      path: "/chat",
      query: { with: COZ_ADDRESS },
    });
  });
});
