// XLabels role sectioning: fixed ROLE_ORDER, empty sections dropped,
// current-network entries sorted first with off-network entries dimmed.
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import XLabels from "@/views/X/XLabels.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("@/utils/neoxEnv", () => ({
  getNeoxNet: vi.fn(() => "mainnet"),
  resolveNeoxNetName: (net) => net,
}));

// Small deterministic registry: bridge spans networks, governance is shared,
// oracle exists only off-network, and the remaining roles are empty.
vi.mock("@/constants/neoxKnownAddresses", () => ({
  NEOX_KNOWN_ADDRESSES: [
    { address: "0xtb", network: "testnet", label: "Testnet Bridge", role: "bridge" },
    { address: "0xmb", network: "mainnet", label: "Mainnet Bridge", role: "bridge" },
    { address: "0xgov", network: "both", label: "Governance", role: "governance" },
    { address: "0xor", network: "testnet", label: "Testnet Oracle", role: "oracle" },
  ],
  NEOX_ROLE_META: {
    governance: { label: "Governance & System" },
    bridge: { label: "Bridge" },
    oracle: { label: "Oracle" },
  },
}));

function mountView() {
  return mount(XLabels, {
    global: {
      stubs: {
        PageHero: { template: "<div><slot /></div>" },
        Breadcrumb: true,
        CopyButton: true,
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });
}

describe("XLabels sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders non-empty roles in ROLE_ORDER and drops empty ones", async () => {
    const wrapper = mountView();
    await flushPromises();

    const headings = wrapper.findAll("h2").map((h) => h.text());
    // governance < bridge < oracle per ROLE_ORDER; validator/token/infra
    // have no entries and must not render a section at all.
    expect(headings).toHaveLength(3);
    expect(headings[0]).toContain("Governance & System");
    expect(headings[1]).toContain("Bridge");
    expect(headings[2]).toContain("Oracle");
  });

  it("sorts current-network entries first and dims off-network ones", async () => {
    const wrapper = mountView();
    await flushPromises();

    const bridgeSection = wrapper.findAll("section.page-container > div > section")[1];
    const cards = bridgeSection.findAll(".etherscan-card");
    expect(cards).toHaveLength(2);
    // Registry lists the testnet bridge first, but on mainnet the mainnet
    // entry must lead and the testnet one is dimmed with an explainer badge.
    expect(cards[0].text()).toContain("Mainnet Bridge");
    expect(cards[0].classes()).not.toContain("opacity-60");
    expect(cards[1].text()).toContain("Testnet Bridge");
    expect(cards[1].classes()).toContain("opacity-60");
    expect(cards[1].text()).toContain("Other network");
  });

  it("counts entries per section including off-network ones", async () => {
    const wrapper = mountView();
    await flushPromises();

    const badges = wrapper.findAll("h2 .badge-soft").map((b) => b.text());
    expect(badges).toEqual(["1", "2", "1"]);
  });
});
