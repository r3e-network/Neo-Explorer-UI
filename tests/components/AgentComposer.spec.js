import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

import AgentComposer from "@/components/agent/AgentComposer.vue";

const DISCLAIMER =
  "The assistant can read and propose only. You always review and sign in your own wallet.";

function makeWrapper(props = {}, options = {}) {
  return mount(AgentComposer, {
    props: { modelValue: "", ...props },
    attachTo: document.body,
    ...options,
  });
}

/**
 * Dispatch a real KeyboardEvent so `isComposing` / `keyCode` carry the exact
 * semantics a browser IME produces (test-utils' synthetic options do not).
 */
function pressEnter(wrapper, { isComposing = false, shiftKey = false, keyCode = null } = {}) {
  const el = wrapper.find("textarea").element;
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    isComposing,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  if (keyCode !== null) {
    Object.defineProperty(event, "keyCode", { configurable: true, value: keyCode });
  }
  el.dispatchEvent(event);
  return event;
}

function stubScrollHeight(el, value) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, value });
}

/**
 * Mount through a host component holding a template ref — the exact way
 * AgentPanel (WP-A) reaches `composerRef.focus()` / `composerRef.reset()`.
 */
function mountWithTemplateRef(props = {}) {
  const composerRef = ref(null);
  const Host = defineComponent({
    name: "ComposerHost",
    setup() {
      return () => h(AgentComposer, { ref: composerRef, modelValue: "", ...props });
    },
  });
  const host = mount(Host, { attachTo: document.body });
  return { host, composerRef };
}

let wrapper;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.replaceChildren();
});

describe("AgentComposer", () => {
  describe("structure", () => {
    beforeEach(() => {
      wrapper = makeWrapper();
    });

    it("renders a textarea, a primary button and the send hint", () => {
      expect(wrapper.find("textarea").exists()).toBe(true);
      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.text()).toContain("Enter to send · Shift+Enter for a new line");
    });

    it("marks the textarea with enterkeyhint=send for soft keyboards", () => {
      expect(wrapper.find("textarea").attributes("enterkeyhint")).toBe("send");
    });

    it("applies the maxlength budget to the textarea", () => {
      expect(wrapper.find("textarea").attributes("maxlength")).toBe("4000");
    });

    it("honours a custom maxLength prop", async () => {
      await wrapper.setProps({ maxLength: 120 });
      expect(wrapper.find("textarea").attributes("maxlength")).toBe("120");
    });

    it("decorative glyphs are hidden from assistive tech", () => {
      const svg = wrapper.find("button svg");
      expect(svg.attributes("aria-hidden")).toBe("true");
    });
  });

  describe("disclaimer", () => {
    it("renders the disclaimer with the contract id in the idle empty state", () => {
      wrapper = makeWrapper();
      const node = wrapper.find("#agent-disclaimer");
      expect(node.exists()).toBe(true);
      expect(node.text()).toBe(DISCLAIMER);
    });

    it("keeps the disclaimer visible while loading and with content", async () => {
      wrapper = makeWrapper({ modelValue: "hello", loading: true });
      expect(wrapper.find("#agent-disclaimer").text()).toBe(DISCLAIMER);

      await wrapper.setProps({ loading: false, modelValue: "" });
      expect(wrapper.find("#agent-disclaimer").text()).toBe(DISCLAIMER);
    });
  });

  describe("v-model", () => {
    it("emits update:modelValue on input", async () => {
      wrapper = makeWrapper();
      await wrapper.find("textarea").setValue("what is in the latest block?");
      expect(wrapper.emitted("update:modelValue")).toEqual([["what is in the latest block?"]]);
    });

    it("reflects the modelValue prop back into the textarea", async () => {
      wrapper = makeWrapper({ modelValue: "seeded" });
      expect(wrapper.find("textarea").element.value).toBe("seeded");
      await wrapper.setProps({ modelValue: "replaced" });
      expect(wrapper.find("textarea").element.value).toBe("replaced");
    });
  });

  describe("IME-safe Enter", () => {
    it("emits nothing and does not preventDefault while composing", () => {
      wrapper = makeWrapper({ modelValue: "にほんご" });
      const event = pressEnter(wrapper, { isComposing: true });
      expect(wrapper.emitted("submit")).toBeUndefined();
      expect(event.defaultPrevented).toBe(false);
    });

    it("emits nothing for the legacy keyCode 229 composition signal", () => {
      wrapper = makeWrapper({ modelValue: "한국어" });
      const event = pressEnter(wrapper, { keyCode: 229 });
      expect(wrapper.emitted("submit")).toBeUndefined();
      expect(event.defaultPrevented).toBe(false);
    });

    it("emits submit on a plain Enter when not composing", () => {
      wrapper = makeWrapper({ modelValue: "explain this transaction" });
      const event = pressEnter(wrapper, { isComposing: false });
      expect(wrapper.emitted("submit")).toHaveLength(1);
      expect(wrapper.emitted("submit")[0]).toEqual([]);
      expect(event.defaultPrevented).toBe(true);
    });

    it("emits nothing for Shift+Enter so the newline survives", () => {
      wrapper = makeWrapper({ modelValue: "line one" });
      const event = pressEnter(wrapper, { shiftKey: true });
      expect(wrapper.emitted("submit")).toBeUndefined();
      expect(event.defaultPrevented).toBe(false);
    });

    it("swallows Enter but emits nothing when the draft is blank", () => {
      wrapper = makeWrapper({ modelValue: "   " });
      const event = pressEnter(wrapper);
      expect(wrapper.emitted("submit")).toBeUndefined();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("submit button", () => {
    it("is a submit button, disabled while the draft is empty", () => {
      wrapper = makeWrapper({ modelValue: "  " });
      const button = wrapper.find("button");
      expect(button.attributes("type")).toBe("submit");
      expect(button.attributes("disabled")).toBeDefined();
      expect(button.attributes("aria-label")).toBe("Send");
    });

    it("enables and submits once the draft has content", async () => {
      wrapper = makeWrapper({ modelValue: "hi" });
      expect(wrapper.find("button").attributes("disabled")).toBeUndefined();
      await wrapper.find("form").trigger("submit");
      expect(wrapper.emitted("submit")).toHaveLength(1);
    });

    it("does not emit submit for a whitespace-only form submission", async () => {
      wrapper = makeWrapper({ modelValue: "\n\t " });
      await wrapper.find("form").trigger("submit");
      expect(wrapper.emitted("submit")).toBeUndefined();
    });
  });

  describe("loading state", () => {
    it("never disables the textarea", async () => {
      wrapper = makeWrapper({ modelValue: "hi", loading: true });
      const textarea = wrapper.find("textarea");
      expect(textarea.attributes("disabled")).toBeUndefined();
      expect(textarea.element.disabled).toBe(false);

      await wrapper.setProps({ modelValue: "" });
      expect(wrapper.find("textarea").attributes("disabled")).toBeUndefined();
    });

    it("marks the textarea aria-busy instead of disabling it", async () => {
      wrapper = makeWrapper({ modelValue: "hi", loading: true });
      expect(wrapper.find("textarea").attributes("aria-busy")).toBe("true");
      await wrapper.setProps({ loading: false });
      expect(wrapper.find("textarea").attributes("aria-busy")).toBe("false");
    });

    it("keeps the textarea focusable and focused across a loading flip", async () => {
      wrapper = makeWrapper({ modelValue: "hi" });
      const el = wrapper.find("textarea").element;
      el.focus();
      expect(document.activeElement).toBe(el);
      await wrapper.setProps({ loading: true });
      expect(document.activeElement).toBe(el);
    });

    it("turns the primary control into a stop button", async () => {
      wrapper = makeWrapper({ modelValue: "hi", loading: true });
      const button = wrapper.find("button");
      expect(button.attributes("type")).toBe("button");
      expect(button.attributes("aria-label")).toBe("Stop");
      expect(button.attributes("disabled")).toBeUndefined();

      await button.trigger("click");
      expect(wrapper.emitted("stop")).toHaveLength(1);
      expect(wrapper.emitted("stop")[0]).toEqual([]);
      expect(wrapper.emitted("submit")).toBeUndefined();
    });

    it("stays a stop button even when the draft is empty", () => {
      wrapper = makeWrapper({ modelValue: "", loading: true });
      expect(wrapper.find("button").attributes("disabled")).toBeUndefined();
      expect(wrapper.find("button").attributes("type")).toBe("button");
    });

    it("emits no stop when idle", async () => {
      wrapper = makeWrapper({ modelValue: "hi" });
      await wrapper.find("button").trigger("click");
      expect(wrapper.emitted("stop")).toBeUndefined();
    });
  });

  describe("character counter", () => {
    it("stays hidden while there is plenty of room left", () => {
      wrapper = makeWrapper({ modelValue: "a".repeat(10), maxLength: 4000 });
      expect(wrapper.find(".agent-counter").exists()).toBe(false);
    });

    it("appears at 200 remaining characters with the count interpolated", async () => {
      wrapper = makeWrapper({ modelValue: "a".repeat(3800), maxLength: 4000 });
      expect(wrapper.find(".agent-counter").text()).toBe("200 characters left");

      await wrapper.setProps({ modelValue: "a".repeat(3999) });
      expect(wrapper.find(".agent-counter").text()).toBe("1 characters left");
    });

    it("never reports a negative remaining count", async () => {
      wrapper = makeWrapper({ modelValue: "a".repeat(4200), maxLength: 4000 });
      await nextTick();
      expect(wrapper.find(".agent-counter").text()).toBe("0 characters left");
    });
  });

  describe("autosize", () => {
    it("grows with content and caps at 128px with its own scrollbar", async () => {
      wrapper = makeWrapper();
      const el = wrapper.find("textarea").element;

      stubScrollHeight(el, 46);
      await wrapper.find("textarea").setValue("one line");
      expect(el.style.height).toBe("46px");
      expect(el.style.overflowY).toBe("hidden");

      stubScrollHeight(el, 640);
      await wrapper.find("textarea").setValue("many\nlines\nof\ntext");
      expect(el.style.height).toBe("128px");
      expect(el.style.overflowY).toBe("auto");
    });

    it("resizes when the parent changes modelValue (suggestion chips)", async () => {
      wrapper = makeWrapper();
      const el = wrapper.find("textarea").element;
      stubScrollHeight(el, 90);
      await wrapper.setProps({ modelValue: "Explain this transaction" });
      await nextTick();
      expect(el.style.height).toBe("90px");
    });
  });

  describe("exposed API", () => {
    it("exposes focus() and moves focus to the textarea", () => {
      const { host, composerRef } = mountWithTemplateRef();
      wrapper = host;
      expect(typeof composerRef.value.focus).toBe("function");
      composerRef.value.focus();
      expect(document.activeElement).toBe(host.find("textarea").element);
    });

    it("exposes reset() and clears the autosize height back to one row", async () => {
      const { host, composerRef } = mountWithTemplateRef();
      wrapper = host;
      const el = host.find("textarea").element;
      stubScrollHeight(el, 300);
      await host.find("textarea").setValue("a\nb\nc\nd\ne");
      expect(el.style.height).toBe("128px");

      expect(typeof composerRef.value.reset).toBe("function");
      composerRef.value.reset();
      expect(el.style.height).toBe("");
      expect(el.style.overflowY).toBe("");
    });

    it("reset() is safe before any input has happened", () => {
      const { host, composerRef } = mountWithTemplateRef();
      wrapper = host;
      expect(() => composerRef.value.reset()).not.toThrow();
      expect(host.find("textarea").element.style.height).toBe("");
    });
  });

  describe("safety", () => {
    it("keeps the send/stop control as the only button in the form", () => {
      // A CopyButton here would default to type=submit and fire the form.
      wrapper = makeWrapper({ modelValue: "hi" });
      expect(wrapper.findAll("form button")).toHaveLength(1);
      expect(wrapper.html()).not.toContain("<script");
    });
  });
});
