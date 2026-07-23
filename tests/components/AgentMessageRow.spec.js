import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { createRouter, createMemoryHistory } from "vue-router";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import AgentMessageRow from "@/components/agent/AgentMessageRow.vue";
import AgentRichText from "@/components/agent/AgentRichText.vue";
import AgentToolTrail from "@/components/agent/AgentToolTrail.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import rowSource from "@/components/agent/AgentMessageRow.vue?raw";

const EN_AGENT_MESSAGES = {
  retry: "Try again",
  unavailableConfigured: "The AI assistant isn't enabled on this deployment yet.",
  unavailableUpstream: "The assistant had a temporary problem. Please try again in a moment.",
  errorGeneric: "Something went wrong reaching the assistant.",
  errorRateLimited: "You've reached the question limit for now. Try again in a moment.",
  errorTooLong: "This conversation got too long. Start a new chat to continue.",
  errorOffline: "You appear to be offline. Check your connection and try again.",
  errorDetails: "Details",
  historyTrimmed: "Earlier messages were trimmed to keep this conversation within limits.",
  stopped: "Stopped",
  regenerate: "Regenerate",
  youSaid: "You said:",
  assistantSaid: "Assistant:",
  copyAnswer: "Copy answer",
  toolsUsedOne: "Used 1 tool",
  toolsUsedMany: "Used {n} tools",
  toolsNote: "Data was fetched with these explorer tools.",
  model: "Model",
};

// Every user-visible string the component is allowed to reach for, straight from
// section (B) of the contract. A key outside this set is a contract violation.
const ALLOWED_I18N_KEYS = new Set([
  "agent.youSaid",
  "agent.assistantSaid",
  "agent.historyTrimmed",
  "agent.stopped",
  "agent.regenerate",
  "agent.retry",
  "agent.copyAnswer",
  "agent.errorGeneric",
  "agent.errorRateLimited",
  "agent.errorTooLong",
  "agent.errorOffline",
  "agent.errorDetails",
  "agent.unavailableConfigured",
  "agent.unavailableUpstream",
]);

const Blank = { name: "Blank", template: "<div />" };

const wrappers = [];
let router;

beforeAll(async () => {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", name: "blank", component: Blank }],
  });
  router.push("/");
  await router.isReady();
});

function makeI18n(agentMessages) {
  return createI18n({
    legacy: false,
    locale: "en",
    fallbackLocale: "en",
    missingWarn: false,
    fallbackWarn: false,
    messages: { en: agentMessages ? { agent: agentMessages } : {} },
  });
}

// `agentMessages: null` models a locale that has not been translated yet: the
// component must render its English tf() fallbacks, never a raw key path.
function mountRow(message, { chain = "n3", slots, agentMessages = EN_AGENT_MESSAGES } = {}) {
  const wrapper = mount(AgentMessageRow, {
    props: { message, chain },
    slots,
    global: { plugins: [makeI18n(agentMessages), router] },
  });
  wrappers.push(wrapper);
  return wrapper;
}

const bubble = (wrapper) => wrapper.find(".agent-bubble");

const styleBlock = rowSource.slice(rowSource.indexOf("<style"));

describe("AgentMessageRow", () => {
  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  describe("user turn", () => {
    it("renders the user's text as plain text, never through the rich renderer", () => {
      const wrapper = mountRow({ id: "m1", role: "user", content: "**not bold** and `not code`" });

      expect(wrapper.findComponent(AgentRichText).exists()).toBe(false);
      expect(wrapper.find(".agent-user-text").text()).toBe("**not bold** and `not code`");
      expect(wrapper.find("strong").exists()).toBe(false);
      expect(wrapper.find("code").exists()).toBe(false);
    });

    it("aligns the user turn to the trailing edge", () => {
      const wrapper = mountRow({ id: "m1", role: "user", content: "hi" });

      expect(wrapper.find(".agent-row").classes()).toContain("agent-row-user");
      expect(bubble(wrapper).classes()).toContain("agent-bubble-user");
    });

    it("escapes user text that looks like markup", () => {
      const hostile = '<img src=x onerror="alert(1)">';
      const wrapper = mountRow({ id: "m1", role: "user", content: hostile });

      expect(wrapper.find(".agent-user-text").text()).toBe(hostile);
      expect(wrapper.find("img").exists()).toBe(false);
      expect(wrapper.html()).toContain("&lt;img");
    });

    it("renders no action row and no tool trail for a user turn", () => {
      const wrapper = mountRow({ id: "m1", role: "user", content: "hi" });

      expect(wrapper.find(".agent-actions").exists()).toBe(false);
      expect(wrapper.findComponent(AgentToolTrail).exists()).toBe(false);
    });
  });

  describe("assistant answer", () => {
    it("renders the answer through AgentRichText with the active chain", () => {
      const wrapper = mountRow(
        { id: "m2", role: "assistant", content: "**Block 42** is sealed." },
        { chain: "neox" },
      );

      const rich = wrapper.findComponent(AgentRichText);
      expect(rich.exists()).toBe(true);
      expect(rich.props("text")).toBe("**Block 42** is sealed.");
      expect(rich.props("chain")).toBe("neox");
      expect(wrapper.find("strong").text()).toBe("Block 42");
    });

    it("links an entity for the chain it was given", () => {
      const evm = `0x${"ab".repeat(20)}`;
      const wrapper = mountRow(
        { id: "m2", role: "assistant", content: `Holder ${evm} moved funds.` },
        { chain: "neox" },
      );

      const link = wrapper.find("a");
      expect(link.exists()).toBe(true);
      expect(link.attributes("href")).toBe(`/x/address/${evm}`);
    });

    it("renders the tool trail underneath the answer", () => {
      const wrapper = mountRow({
        id: "m2",
        role: "assistant",
        content: "Done.",
        toolUses: ["get_block", "get_tx"],
        model: "deepseek-chat",
      });

      const trail = wrapper.findComponent(AgentToolTrail);
      expect(trail.exists()).toBe(true);
      expect(trail.props("tools")).toEqual(["get_block", "get_tx"]);
      expect(trail.props("model")).toBe("deepseek-chat");
    });

    it("degrades cleanly when toolUses and model are absent", () => {
      const wrapper = mountRow({ id: "m2", role: "assistant", content: "Done." });

      const trail = wrapper.findComponent(AgentToolTrail);
      expect(trail.props("tools")).toEqual([]);
      expect(trail.props("model")).toBe("");
      expect(trail.find(".agent-tool-trail").exists()).toBe(false);
    });

    it("offers a copy button named for the answer, at a >=24px size", () => {
      const wrapper = mountRow({ id: "m2", role: "assistant", content: "Block 42 is sealed." });

      const copy = wrapper.findComponent(CopyButton);
      expect(copy.exists()).toBe(true);
      expect(copy.props("text")).toBe("Block 42 is sealed.");
      // `xs` is a 16px target and fails WCAG 2.2 SC 2.5.8.
      expect(copy.props("size")).toBe("sm");
      expect(copy.attributes("aria-label")).toBe("Copy answer");
    });

    it("omits the copy button when there is no answer text to copy", () => {
      const wrapper = mountRow({
        id: "m2",
        role: "assistant",
        content: "",
        toolUses: ["get_block"],
      });

      expect(wrapper.findComponent(CopyButton).exists()).toBe(false);
      expect(wrapper.find(".agent-regenerate").exists()).toBe(true);
    });

    it("emits regenerate from the action row", async () => {
      const wrapper = mountRow({ id: "m2", role: "assistant", content: "Done." });

      await wrapper.find(".agent-actions .agent-regenerate").trigger("click");

      expect(wrapper.emitted("regenerate")).toHaveLength(1);
      expect(wrapper.emitted("regenerate")[0]).toEqual([]);
      expect(wrapper.emitted("retry")).toBeUndefined();
    });

    it("renders no bubble at all when the answer is empty", () => {
      const wrapper = mountRow({ id: "m2", role: "assistant", content: "" });

      expect(bubble(wrapper).exists()).toBe(false);
      expect(wrapper.find(".agent-actions").exists()).toBe(false);
    });
  });

  describe("stopped turn", () => {
    it("reads as stopped and offers Regenerate", async () => {
      const wrapper = mountRow({ id: "m3", role: "assistant", content: "", stopped: true });

      expect(bubble(wrapper).classes()).toContain("agent-bubble-stopped");
      expect(wrapper.text()).toContain("Stopped");

      const button = wrapper.find(".agent-regenerate");
      expect(button.element.tagName).toBe("BUTTON");
      expect(button.attributes("type")).toBe("button");
      expect(button.classes()).toContain("btn-outline");
      expect(button.text()).toBe("Regenerate");

      await button.trigger("click");
      expect(wrapper.emitted("regenerate")).toHaveLength(1);
      expect(wrapper.emitted("retry")).toBeUndefined();
    });

    it("does not render partial content through the answer path", () => {
      const wrapper = mountRow({ id: "m3", role: "assistant", content: "", stopped: true });

      expect(wrapper.findComponent(AgentRichText).exists()).toBe(false);
      expect(wrapper.find(".agent-actions").exists()).toBe(false);
    });
  });

  describe("unavailable turn", () => {
    it("shows the not-configured copy with no retry (a retry cannot fix it)", () => {
      const wrapper = mountRow({
        id: "m4",
        role: "assistant",
        content: "",
        unavailable: true,
        reason: "agent_not_configured",
      });

      expect(bubble(wrapper).classes()).toContain("agent-bubble-unavailable");
      expect(wrapper.text()).toContain("The AI assistant isn't enabled on this deployment yet.");
      expect(wrapper.find(".agent-retry").exists()).toBe(false);
    });

    it("shows the upstream copy with a retry that emits retry", async () => {
      const wrapper = mountRow({
        id: "m4",
        role: "assistant",
        content: "",
        unavailable: true,
        reason: "agent_upstream_error",
      });

      expect(wrapper.text()).toContain("The assistant had a temporary problem.");

      const button = wrapper.find(".agent-retry");
      expect(button.exists()).toBe(true);
      expect(button.attributes("type")).toBe("button");
      await button.trigger("click");

      expect(wrapper.emitted("retry")).toHaveLength(1);
      expect(wrapper.emitted("regenerate")).toBeUndefined();
    });

    it("defaults to the not-configured copy when no reason is given", () => {
      const wrapper = mountRow({ id: "m4", role: "assistant", content: "", unavailable: true });

      expect(wrapper.text()).toContain("The AI assistant isn't enabled on this deployment yet.");
      expect(wrapper.find(".agent-retry").exists()).toBe(false);
    });
  });

  describe("error turn", () => {
    const errorCases = [
      ["rateLimited", "You've reached the question limit for now. Try again in a moment.", true],
      ["tooLong", "This conversation got too long. Start a new chat to continue.", false],
      ["offline", "You appear to be offline. Check your connection and try again.", true],
      ["generic", "Something went wrong reaching the assistant.", true],
    ];

    it.each(errorCases)("renders %s copy and the right retry affordance", (kind, copy, retry) => {
      const wrapper = mountRow({
        id: "m5",
        role: "assistant",
        content: "",
        error: { kind },
      });

      expect(bubble(wrapper).classes()).toContain("agent-bubble-error");
      expect(wrapper.text()).toContain(copy);
      expect(wrapper.find(".agent-retry").exists()).toBe(retry);
    });

    it("emits retry from the error retry button", async () => {
      const wrapper = mountRow({ id: "m5", role: "assistant", content: "", error: { kind: "generic" } });

      await wrapper.find(".agent-retry").trigger("click");

      expect(wrapper.emitted("retry")).toHaveLength(1);
    });

    it("hides the technical detail behind a disclosure, in mono", () => {
      const wrapper = mountRow({
        id: "m5",
        role: "assistant",
        content: "",
        error: { kind: "generic", detail: "AgentServiceError: 500 upstream_failed" },
      });

      const details = wrapper.find("details");
      expect(details.exists()).toBe(true);
      expect(details.find("summary").text()).toBe("Details");
      // The headline stays human; the stack-ish string never leads.
      expect(wrapper.find(".agent-state-text").text()).toBe(
        "Something went wrong reaching the assistant.",
      );
      const body = details.find(".agent-detail-body");
      expect(body.classes()).toContain("font-hash");
      expect(body.text()).toBe("AgentServiceError: 500 upstream_failed");
    });

    it("renders no disclosure when there is no detail", () => {
      const wrapper = mountRow({ id: "m5", role: "assistant", content: "", error: { kind: "offline" } });

      expect(wrapper.find("details").exists()).toBe(false);
    });

    it("treats an unknown or legacy error shape as generic", () => {
      const legacy = mountRow({ id: "m5", role: "assistant", content: "", error: true });
      expect(legacy.text()).toContain("Something went wrong reaching the assistant.");
      expect(legacy.find(".agent-retry").exists()).toBe(true);

      const unknown = mountRow({
        id: "m6",
        role: "assistant",
        content: "",
        error: { kind: "meteor_strike" },
      });
      expect(unknown.text()).toContain("Something went wrong reaching the assistant.");
    });

    it("escapes an error detail that looks like markup", () => {
      const hostile = "<script>alert(1)</script>";
      const wrapper = mountRow({
        id: "m5",
        role: "assistant",
        content: "",
        error: { kind: "generic", detail: hostile },
      });

      expect(wrapper.find(".agent-detail-body").text()).toBe(hostile);
      expect(wrapper.element.querySelectorAll("script")).toHaveLength(0);
    });
  });

  describe("history-trim divider", () => {
    it("renders a full-width divider above the row when the history was trimmed", () => {
      const wrapper = mountRow({
        id: "m7",
        role: "user",
        content: "and then?",
        trimmedBefore: true,
      });

      const trim = wrapper.find(".agent-trim");
      expect(trim.exists()).toBe(true);
      expect(trim.find(".agent-trim-label").text()).toBe(
        "Earlier messages were trimmed to keep this conversation within limits.",
      );
      expect(trim.findAll(".agent-trim-rule")).toHaveLength(2);
      // The divider belongs to the transcript, not to the bubble.
      expect(bubble(wrapper).element.contains(trim.element)).toBe(false);
      // ...and it precedes the row it annotates.
      const children = [...wrapper.element.children];
      expect(children.indexOf(trim.element)).toBeLessThan(
        children.indexOf(wrapper.find(".agent-row").element),
      );
    });

    it("renders no divider by default", () => {
      const wrapper = mountRow({ id: "m7", role: "user", content: "hi" });

      expect(wrapper.find(".agent-trim").exists()).toBe(false);
    });

    it("hides the decorative rules from assistive technology", () => {
      const wrapper = mountRow({ id: "m7", role: "user", content: "hi", trimmedBefore: true });

      wrapper.findAll(".agent-trim-rule").forEach((rule) => {
        expect(rule.attributes("aria-hidden")).toBe("true");
      });
    });
  });

  describe("proposals slot", () => {
    const proposals = [{ kind: "n3", scriptHash: "0xabc" }, { kind: "n3", scriptHash: "0xdef" }];
    const slots = {
      proposals: `<template #proposals="{ proposals }">
        <p v-for="(p, i) in proposals" :key="i" class="stub-proposal">{{ p.scriptHash }}</p>
      </template>`,
    };

    it("passes the proposals through the scoped slot", () => {
      const wrapper = mountRow(
        { id: "m8", role: "assistant", content: "Here you go.", proposals },
        { slots },
      );

      const cards = wrapper.findAll(".stub-proposal");
      expect(cards).toHaveLength(2);
      expect(cards[0].text()).toBe("0xabc");
      expect(cards[1].text()).toBe("0xdef");
    });

    it("renders the slot outside the bubble padding, at transcript width", () => {
      const wrapper = mountRow(
        { id: "m8", role: "assistant", content: "Here you go.", proposals },
        { slots },
      );

      const card = wrapper.find(".stub-proposal").element;
      expect(bubble(wrapper).element.contains(card)).toBe(false);
      expect(wrapper.find(".agent-row").element.contains(card)).toBe(false);
      expect(wrapper.find(".agent-proposals").element.contains(card)).toBe(true);
    });

    it("opts the proposals region out of the transcript live region", () => {
      const wrapper = mountRow(
        { id: "m8", role: "assistant", content: "Here you go.", proposals },
        { slots },
      );

      expect(wrapper.find(".agent-proposals").attributes("aria-live")).toBe("off");
    });

    it("renders the proposals region only when there are proposals", () => {
      const none = mountRow({ id: "m8", role: "assistant", content: "Nothing to sign." }, { slots });
      expect(none.find(".agent-proposals").exists()).toBe(false);
      expect(none.find(".stub-proposal").exists()).toBe(false);

      const empty = mountRow(
        { id: "m9", role: "assistant", content: "Nothing to sign.", proposals: [] },
        { slots },
      );
      expect(empty.find(".agent-proposals").exists()).toBe(false);
    });

    it("still renders proposals when the answer text is empty", () => {
      const wrapper = mountRow({ id: "m8", role: "assistant", content: "", proposals }, { slots });

      expect(bubble(wrapper).exists()).toBe(false);
      expect(wrapper.findAll(".stub-proposal")).toHaveLength(2);
    });
  });

  describe("accessibility", () => {
    it("puts an sr-only speaker prefix first inside every bubble", () => {
      const cases = [
        { id: "a", role: "user", content: "hi" },
        { id: "b", role: "assistant", content: "hello" },
        { id: "c", role: "assistant", content: "", stopped: true },
        { id: "d", role: "assistant", content: "", unavailable: true, reason: "agent_not_configured" },
        { id: "e", role: "assistant", content: "", unavailable: true, reason: "agent_upstream_error" },
        { id: "f", role: "assistant", content: "", error: { kind: "generic" } },
      ];

      cases.forEach((message) => {
        const wrapper = mountRow(message);
        const bubbleEl = bubble(wrapper);
        expect(bubbleEl.exists()).toBe(true);
        const first = bubbleEl.element.firstElementChild;
        expect(first.classList.contains("sr-only")).toBe(true);
        expect(first.textContent).toBe(message.role === "user" ? "You said:" : "Assistant:");
      });
    });

    it("gives each state a distinct accessible name", () => {
      const cases = [
        { id: "a", role: "user", content: "What happened in block 42?" },
        { id: "b", role: "assistant", content: "Block 42 sealed 3 transactions." },
        { id: "c", role: "assistant", content: "", stopped: true },
        { id: "d", role: "assistant", content: "", unavailable: true, reason: "agent_not_configured" },
        { id: "e", role: "assistant", content: "", unavailable: true, reason: "agent_upstream_error" },
        { id: "f", role: "assistant", content: "", error: { kind: "rateLimited" } },
        { id: "g", role: "assistant", content: "", error: { kind: "tooLong" } },
        { id: "h", role: "assistant", content: "", error: { kind: "offline" } },
        { id: "i", role: "assistant", content: "", error: { kind: "generic" } },
      ];

      const names = cases.map((message) => mountRow(message).find(".agent-bubble").text());

      expect(names).toHaveLength(9);
      names.forEach((name) => expect(name.trim().length).toBeGreaterThan(0));
      expect(new Set(names).size).toBe(9);
    });

    it("renders English fallbacks, never raw key paths, when the locale lacks the keys", () => {
      const wrapper = mountRow(
        {
          id: "m10",
          role: "assistant",
          content: "",
          trimmedBefore: true,
          error: { kind: "rateLimited", detail: "429" },
        },
        { agentMessages: null },
      );

      const text = wrapper.text();
      expect(text).toContain("You've reached the question limit for now.");
      expect(text).toContain("Details");
      expect(text).toContain("Earlier messages were trimmed");
      expect(text).not.toContain("agent.");
    });

    it("keeps every control keyboard operable and typed as a button", () => {
      const wrapper = mountRow({ id: "m11", role: "assistant", content: "", error: { kind: "generic" } });

      wrapper.findAll("button").forEach((button) => {
        expect(button.attributes("type")).toBe("button");
        expect(button.attributes("disabled")).toBeUndefined();
      });
    });
  });

  describe("message immutability", () => {
    it("never writes to the message object it was handed", async () => {
      const message = Object.freeze({
        id: "m12",
        role: "assistant",
        content: "Done.",
        toolUses: Object.freeze(["get_block"]),
        proposals: Object.freeze([]),
      });

      const wrapper = mountRow(message);
      await wrapper.find(".agent-actions .agent-regenerate").trigger("click");

      expect(message).toEqual({
        id: "m12",
        role: "assistant",
        content: "Done.",
        toolUses: ["get_block"],
        proposals: [],
      });
    });

    it("survives a malformed message without throwing", () => {
      expect(() => mountRow({ id: "m13", role: "assistant" })).not.toThrow();
      expect(() =>
        mountRow({ id: "m14", role: "assistant", content: 42, toolUses: "nope", proposals: null }),
      ).not.toThrow();
    });
  });

  describe("source guarantees", () => {
    it("never renders model output through an HTML sink", () => {
      expect(rowSource).not.toMatch(/v-html/);
      expect(rowSource).not.toMatch(/innerHTML/);
      expect(rowSource).not.toMatch(/new Function/);
      expect(rowSource).not.toMatch(/dangerouslySetInnerHTML/);
    });

    it("does not import the proposal card — WP-A owns that import", () => {
      expect(rowSource).not.toContain("AgentProposalCard");
    });

    it("declares exactly the contract's emits", () => {
      expect(AgentMessageRow.emits).toEqual(["retry", "regenerate"]);
    });

    it("ships a reduced-motion block", () => {
      expect(styleBlock).toContain("@media (prefers-reduced-motion: reduce)");
      expect(styleBlock).toMatch(
        /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.agent-actions\s*\{[^}]*transition:\s*none/,
      );
    });

    it("ships explicit dark rules for every bespoke surface", () => {
      [
        "agent-bubble-user",
        "agent-bubble-assistant",
        "agent-bubble-error",
        "agent-bubble-unavailable",
        "agent-bubble-stopped",
        "agent-trim-rule",
      ].forEach((name) => {
        expect(styleBlock).toContain(`.dark .${name}`);
      });
    });

    it("never carries a white inset hairline into dark mode", () => {
      const darkRules = styleBlock.match(/\.dark [^{]*\{[^}]*\}/g) || [];
      expect(darkRules.length).toBeGreaterThan(0);
      darkRules.forEach((rule) => {
        expect(rule).not.toMatch(/rgba\(255,\s*255,\s*255,\s*0?\.[3-9]/);
      });
    });

    it("draws colour from tokens only, never literal hex", () => {
      expect(styleBlock).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(styleBlock).toContain("var(--line-soft)");
      expect(styleBlock).toContain("var(--status-warning)");
      expect(styleBlock).toContain("var(--status-error)");
    });

    it("avoids --text-low, which fails contrast at these sizes in light mode", () => {
      expect(rowSource).not.toContain("--text-low");
      expect(rowSource).not.toMatch(/\btext-low\b/);
    });

    it("keeps the action row focusable while hidden so keyboard users reach it", () => {
      expect(styleBlock).toMatch(/\.agent-actions\s*\{[^}]*opacity:\s*0/);
      expect(styleBlock).not.toMatch(/\.agent-actions\s*\{[^}]*(display:\s*none|visibility:\s*hidden)/);
      expect(styleBlock).toContain(".agent-message:focus-within .agent-actions");
      expect(styleBlock).toMatch(/@media \(max-width: 767px\)\s*\{\s*\.agent-actions\s*\{[^}]*opacity:\s*1/);
    });

    it("reserves >=24px hit targets for its own small controls", () => {
      expect(styleBlock).toMatch(/\.agent-action-btn\s*\{[^}]*min-height:\s*1\.5rem/);
      expect(styleBlock).toMatch(/\.agent-summary\s*\{[^}]*min-height:\s*1\.5rem/);
    });

    it("only uses i18n keys from the contract", () => {
      const used = new Set([...rowSource.matchAll(/"(agent\.[A-Za-z][A-Za-z0-9.]*)"/g)].map((m) => m[1]));
      expect(used.size).toBeGreaterThan(0);
      used.forEach((key) => expect(ALLOWED_I18N_KEYS.has(key)).toBe(true));
    });
  });
});
