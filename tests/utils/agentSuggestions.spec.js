import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTEXT_SUGGESTION_PREFIXES,
  SUGGESTION_IDS,
  buildSuggestions,
  contextSuggestionId,
} from "@/utils/agentSuggestions";

const i18nMock = vi.hoisted(() => ({ translations: {} }));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => (Object.prototype.hasOwnProperty.call(i18nMock.translations, key) ? i18nMock.translations[key] : key),
  }),
}));

// Imported after the mock so the component picks up the stubbed useI18n.
const AgentSuggestions = (await import("@/components/agent/AgentSuggestions.vue")).default;

// The complete `agent.suggest.*` key list from the build contract, section (B).
// A chip may use nothing outside this set.
const CONTRACT_KEYS = Object.freeze({
  "agent.suggest.latestBlock": "What's in the latest block?",
  "agent.suggest.explainTx": "Explain this transaction",
  "agent.suggest.addressHoldings": "What tokens does this address hold?",
  "agent.suggest.contractSummary": "What does this contract do?",
  "agent.suggest.tokenHolders": "Who are the top holders of this token?",
  "agent.suggest.networkStatus": "How is the network doing right now?",
  "agent.suggest.gasPrice": "What are gas fees on Neo X right now?",
  "agent.suggest.proposeTransfer": "Help me prepare a GAS transfer to review",
});

// Realistic detail-route paths for each supported prefix.
const ROUTE_SAMPLES = Object.freeze([
  { path: "/transaction-info/0xabc123", expected: "explainTx" },
  { path: "/x/tx/0xdef456", expected: "explainTx" },
  { path: "/account-profile/NgaiKFjurmNmiRzDRQGs44yzByXuSkdGPF", expected: "addressHoldings" },
  { path: "/x/address/0x1111111111111111111111111111111111111111", expected: "addressHoldings" },
  { path: "/contract-info/0xd2a4cff31913016155e38e474a2c06d08be276cf", expected: "contractSummary" },
  { path: "/x/token/0x2222222222222222222222222222222222222222", expected: "tokenHolders" },
]);

const CHAINS = Object.freeze(["n3", "neox"]);

// `wrapper.emitted()` also records native DOM events that bubble to the root
// node, so component emits are whatever is left after removing those.
const NATIVE_DOM_EVENTS = Object.freeze(["click", "pointerdown", "pointerup", "mousedown", "mouseup", "focus", "blur"]);

function ids(list) {
  return list.map((entry) => entry.id);
}

function componentEmits(wrapper) {
  return Object.keys(wrapper.emitted()).filter((name) => !NATIVE_DOM_EVENTS.includes(name));
}

describe("buildSuggestions", () => {
  it("maps every supported detail-route prefix to its contextual chip on both chains", () => {
    expect(ROUTE_SAMPLES).toHaveLength(CONTEXT_SUGGESTION_PREFIXES.length);

    for (const sample of ROUTE_SAMPLES) {
      for (const chain of CHAINS) {
        const result = buildSuggestions({ path: sample.path, chain });
        expect(ids(result)[0], `${sample.path} on ${chain}`).toBe(sample.expected);
        expect(result).toHaveLength(4);
      }
    }
  });

  it("exposes each contract prefix through contextSuggestionId", () => {
    for (const entry of CONTEXT_SUGGESTION_PREFIXES) {
      expect(contextSuggestionId(`${entry.prefix}value`)).toBe(entry.id);
    }
    expect(contextSuggestionId("/homepage")).toBeNull();
    expect(contextSuggestionId("/x")).toBeNull();
    expect(contextSuggestionId("")).toBeNull();
    expect(contextSuggestionId(undefined)).toBeNull();
    expect(contextSuggestionId(null)).toBeNull();
  });

  it("falls back to three generic chips on a route with no contextual match", () => {
    expect(ids(buildSuggestions({ path: "/homepage", chain: "n3" }))).toEqual([
      "latestBlock",
      "networkStatus",
      "proposeTransfer",
    ]);
    expect(ids(buildSuggestions())).toEqual(["latestBlock", "networkStatus", "proposeTransfer"]);
  });

  it("swaps networkStatus for gasPrice on Neo X only", () => {
    expect(ids(buildSuggestions({ path: "/x", chain: "neox" }))).toEqual([
      "latestBlock",
      "gasPrice",
      "proposeTransfer",
    ]);
    expect(ids(buildSuggestions({ path: "/homepage", chain: "both" }))).toContain("networkStatus");
    expect(ids(buildSuggestions({ path: "/homepage", chain: "both" }))).not.toContain("gasPrice");
  });

  it("always includes exactly one proposeTransfer chip, always last", () => {
    const paths = ["/", "/homepage", "/x", "/nowhere", ...ROUTE_SAMPLES.map((sample) => sample.path)];

    for (const path of paths) {
      for (const chain of ["n3", "neox", "both"]) {
        const list = buildSuggestions({ path, chain });
        const proposeCount = ids(list).filter((id) => id === "proposeTransfer").length;

        expect(proposeCount, `${path} on ${chain}`).toBe(1);
        expect(list[list.length - 1].id, `${path} on ${chain}`).toBe("proposeTransfer");
      }
    }
  });

  it("never repeats a chip id and always returns three or four chips", () => {
    const paths = ["/", "/homepage", "/x", ...ROUTE_SAMPLES.map((sample) => sample.path)];

    for (const path of paths) {
      for (const chain of ["n3", "neox", "both"]) {
        const list = buildSuggestions({ path, chain });
        const seen = ids(list);

        expect(new Set(seen).size, `${path} on ${chain}`).toBe(seen.length);
        expect(seen.length).toBeGreaterThanOrEqual(3);
        expect(seen.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it("only ever emits keys from the contract's agent.suggest.* list", () => {
    const paths = ["/", ...ROUTE_SAMPLES.map((sample) => sample.path)];

    for (const path of paths) {
      for (const chain of ["n3", "neox", "both"]) {
        for (const entry of buildSuggestions({ path, chain })) {
          expect(CONTRACT_KEYS).toHaveProperty(entry.key);
          expect(entry.fallback).toBe(CONTRACT_KEYS[entry.key]);
          expect(typeof entry.id).toBe("string");
          expect(entry.id.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("declares every id in SUGGESTION_IDS and returns frozen, reusable entries", () => {
    expect(SUGGESTION_IDS).toEqual(
      expect.arrayContaining([
        "explainTx",
        "addressHoldings",
        "contractSummary",
        "tokenHolders",
        "latestBlock",
        "networkStatus",
        "gasPrice",
        "proposeTransfer",
      ]),
    );

    const [first] = buildSuggestions({ path: "/homepage", chain: "n3" });
    expect(Object.isFrozen(first)).toBe(true);

    // A fresh array each call: mutating one result must not leak into the next.
    const list = buildSuggestions({ path: "/homepage", chain: "n3" });
    list.pop();
    expect(buildSuggestions({ path: "/homepage", chain: "n3" })).toHaveLength(3);
  });
});

describe("AgentSuggestions.vue", () => {
  const wrappers = [];

  function mountSuggestions(props = {}) {
    const wrapper = mount(AgentSuggestions, { props });
    wrappers.push(wrapper);
    return wrapper;
  }

  beforeEach(() => {
    i18nMock.translations = {};
  });

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it("renders the eyebrow and one chip per suggestion for the current route", () => {
    const wrapper = mountSuggestions({ path: "/transaction-info/0xabc", chain: "n3" });

    expect(wrapper.text()).toContain("Try asking");

    const chips = wrapper.findAll("button");
    expect(chips).toHaveLength(4);
    expect(chips.map((chip) => chip.attributes("data-suggestion-id"))).toEqual([
      "explainTx",
      "latestBlock",
      "networkStatus",
      "proposeTransfer",
    ]);
    expect(chips[0].text()).toBe("Explain this transaction");
    chips.forEach((chip) => expect(chip.attributes("type")).toBe("button"));
  });

  it("emits select with the resolved prompt text and emits nothing else", async () => {
    const wrapper = mountSuggestions({ path: "/homepage", chain: "n3" });

    await wrapper.findAll("button")[0].trigger("click");

    expect(wrapper.emitted("select")).toEqual([["What's in the latest block?"]]);
    expect(componentEmits(wrapper)).toEqual(["select"]);
    expect(AgentSuggestions.emits).toEqual(["select"]);
  });

  it("emits the translated string when a locale provides one", async () => {
    i18nMock.translations = {
      "agent.suggest.latestBlock": "最新区块里有什么？",
      "agent.suggestionsTitle": "试着问",
    };
    const wrapper = mountSuggestions({ path: "/homepage", chain: "n3" });

    expect(wrapper.text()).toContain("试着问");
    await wrapper.findAll("button")[0].trigger("click");

    expect(wrapper.emitted("select")).toEqual([["最新区块里有什么？"]]);
  });

  it("renders the Neo X chip set when the pinned chain is neox", () => {
    const wrapper = mountSuggestions({ path: "/x/address/0xabc", chain: "neox" });

    expect(wrapper.findAll("button").map((chip) => chip.attributes("data-suggestion-id"))).toEqual([
      "addressHoldings",
      "latestBlock",
      "gasPrice",
      "proposeTransfer",
    ]);
  });

  it("reacts to route and chain prop changes", async () => {
    const wrapper = mountSuggestions({ path: "/homepage", chain: "n3" });

    await wrapper.setProps({ path: "/contract-info/0xabc", chain: "neox" });

    expect(wrapper.findAll("button").map((chip) => chip.attributes("data-suggestion-id"))).toEqual([
      "contractSummary",
      "latestBlock",
      "gasPrice",
      "proposeTransfer",
    ]);
  });

  it("disables every chip and emits nothing while disabled", async () => {
    const wrapper = mountSuggestions({ path: "/homepage", chain: "n3", disabled: true });
    const chips = wrapper.findAll("button");

    chips.forEach((chip) => expect(chip.attributes("disabled")).toBeDefined());

    await chips[0].trigger("click");
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("never auto-sends: the component exposes no send path", () => {
    const wrapper = mountSuggestions({ path: "/homepage", chain: "n3" });

    expect(wrapper.emitted()).toEqual({});
    expect(wrapper.findAll("form")).toHaveLength(0);
    expect(wrapper.findAll("[type='submit']")).toHaveLength(0);
  });
});
