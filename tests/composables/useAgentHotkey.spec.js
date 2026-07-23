import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import {
  isApplePlatform,
  isEditableTarget,
  useAgentHotkey,
} from "@/composables/useAgentHotkey";
import AgentLauncher from "@/components/agent/AgentLauncher.vue";
import launcherSource from "@/components/agent/AgentLauncher.vue?raw";

// The panel is WP-A's package; the launcher only needs to mount *something*
// there. Stubbing it keeps this suite honest about the launcher alone.
vi.mock("@/components/agent/AgentPanel.vue", () => ({
  default: {
    name: "AgentPanel",
    props: { open: { type: Boolean, default: false } },
    emits: ["close"],
    render: () => null,
  },
}));

const i18nMock = vi.hoisted(() => ({ t: vi.fn((key) => key) }));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: i18nMock.t }),
}));

const wrappers = [];
const navigatorRestores = [];

/** Shadow navigator properties with own, configurable ones jsdom lets us drop. */
function stubNavigator(props) {
  for (const [key, value] of Object.entries(props)) {
    const previous = Object.prototype.hasOwnProperty.call(navigator, key)
      ? Object.getOwnPropertyDescriptor(navigator, key)
      : null;
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
    navigatorRestores.push(() => {
      if (previous) Object.defineProperty(navigator, key, previous);
      else delete navigator[key];
    });
  }
}

const HotkeyHost = defineComponent({
  props: { handler: { type: Function, required: true } },
  setup(props) {
    const { shortcutLabel } = useAgentHotkey(props.handler);
    return () => h("span", { class: "label" }, shortcutLabel.value);
  },
});

function mountHost(handler) {
  const wrapper = mount(HotkeyHost, { props: { handler }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

function mountLauncher() {
  const wrapper = mount(AgentLauncher, { attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

/**
 * Dispatch a keydown that bubbles to document, optionally from a specific
 * element so the "typing in a field" path is exercised for real.
 */
function press(init = {}, target = document) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function makeField(tag) {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

describe("useAgentHotkey", () => {
  beforeEach(() => {
    i18nMock.t.mockReset();
    // Untranslated locale: tf() must fall back to the English default.
    i18nMock.t.mockImplementation((key) => key);
  });

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    navigatorRestores.splice(0).forEach((restore) => restore());
    document.body.innerHTML = "";
  });

  describe("chord handling", () => {
    it("toggles on Meta+J and prevents the browser default", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);

      const event = press({ key: "j", metaKey: true });

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("toggles on Ctrl+J", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);

      const event = press({ key: "j", ctrlKey: true });

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("toggles on Meta+Shift+J (uppercase key value)", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);

      press({ key: "J", metaKey: true, shiftKey: true });

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("ignores other chords so Cmd/Ctrl+K stays free", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);

      const event = press({ key: "k", metaKey: true });

      expect(onToggle).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("ignores auto-repeat so a held chord cannot strobe the drawer", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);

      press({ key: "j", metaKey: true, repeat: true });

      expect(onToggle).not.toHaveBeenCalled();
    });

    it("ignores keystrokes another handler already consumed", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);

      const event = new KeyboardEvent("keydown", { key: "j", metaKey: true, bubbles: true, cancelable: true });
      event.preventDefault();
      document.dispatchEvent(event);

      expect(onToggle).not.toHaveBeenCalled();
    });

    it("does nothing when no callback was supplied", () => {
      mountHost(undefined);

      expect(() => press({ key: "j", metaKey: true })).not.toThrow();
    });
  });

  describe("text-entry surfaces", () => {
    it("still fires from inside a textarea (the agent composer)", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);
      const textarea = makeField("textarea");
      textarea.focus();

      const event = press({ key: "j", metaKey: true }, textarea);

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("still fires from inside an input", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);
      const input = makeField("input");

      press({ key: "j", ctrlKey: true }, input);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("still fires from a contenteditable region", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);
      const editable = makeField("div");
      Object.defineProperty(editable, "isContentEditable", { value: true, configurable: true });

      press({ key: "j", metaKey: true }, editable);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("never swallows a bare 'j' typed into a field", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);
      const input = makeField("input");

      const event = press({ key: "j" }, input);

      expect(onToggle).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("leaves the bare '/' shortcut for SearchBox untouched", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);

      const fromBody = press({ key: "/" });
      const fromField = press({ key: "/" }, makeField("input"));

      expect(onToggle).not.toHaveBeenCalled();
      expect(fromBody.defaultPrevented).toBe(false);
      expect(fromField.defaultPrevented).toBe(false);
    });

    it("ignores a bare 'j' outside any field too", () => {
      const onToggle = vi.fn();
      mountHost(onToggle);

      const event = press({ key: "j" });

      expect(onToggle).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("lifecycle", () => {
    it("removes the document listener on unmount", () => {
      const onToggle = vi.fn();
      const wrapper = mountHost(onToggle);

      press({ key: "j", metaKey: true });
      expect(onToggle).toHaveBeenCalledTimes(1);

      wrapper.unmount();
      wrappers.splice(wrappers.indexOf(wrapper), 1);
      press({ key: "j", metaKey: true });

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("shortcutLabel", () => {
    it("renders ⌘J when userAgentData reports macOS", () => {
      stubNavigator({ userAgentData: { platform: "macOS" } });
      const wrapper = mountHost(vi.fn());

      expect(wrapper.get(".label").text()).toBe("⌘J");
    });

    it("renders Ctrl+J when userAgentData reports Windows", () => {
      stubNavigator({ userAgentData: { platform: "Windows" }, platform: "MacIntel" });
      const wrapper = mountHost(vi.fn());

      expect(wrapper.get(".label").text()).toBe("Ctrl+J");
    });

    it("falls back to navigator.platform for Apple devices", () => {
      stubNavigator({ userAgentData: undefined, platform: "iPhone" });
      const wrapper = mountHost(vi.fn());

      expect(wrapper.get(".label").text()).toBe("⌘J");
    });

    it("falls back to the user-agent string when no platform is exposed", () => {
      stubNavigator({
        userAgentData: undefined,
        platform: "",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      });
      const wrapper = mountHost(vi.fn());

      expect(wrapper.get(".label").text()).toBe("⌘J");
    });

    it("defaults to Ctrl+J on unknown platforms", () => {
      stubNavigator({ userAgentData: undefined, platform: "Linux x86_64", userAgent: "Linux" });
      const wrapper = mountHost(vi.fn());

      expect(wrapper.get(".label").text()).toBe("Ctrl+J");
    });
  });

  describe("isApplePlatform / isEditableTarget", () => {
    it("detects Apple platforms case-insensitively", () => {
      stubNavigator({ userAgentData: undefined, platform: "MacIntel" });
      expect(isApplePlatform()).toBe(true);
    });

    it("reports false for non-Apple platforms", () => {
      stubNavigator({ userAgentData: undefined, platform: "Win32", userAgent: "Windows NT" });
      expect(isApplePlatform()).toBe(false);
    });

    it("classifies text-entry targets", () => {
      expect(isEditableTarget(document.createElement("input"))).toBe(true);
      expect(isEditableTarget(document.createElement("textarea"))).toBe(true);
      expect(isEditableTarget(document.createElement("select"))).toBe(true);
      expect(isEditableTarget(document.createElement("div"))).toBe(false);
      expect(isEditableTarget(null)).toBe(false);
      expect(isEditableTarget(document)).toBe(false);
    });
  });
});

describe("AgentLauncher", () => {
  beforeEach(() => {
    i18nMock.t.mockReset();
    i18nMock.t.mockImplementation((key) => key);
  });

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    navigatorRestores.splice(0).forEach((restore) => restore());
    document.body.innerHTML = "";
  });

  it("omits aria-controls while the panel is closed and sets it once open", async () => {
    const wrapper = mountLauncher();
    const fab = wrapper.get("button.agent-fab");

    expect(fab.attributes("aria-controls")).toBeUndefined();
    expect(fab.attributes("aria-expanded")).toBe("false");
    expect(fab.attributes("aria-haspopup")).toBe("dialog");

    await fab.trigger("click");

    expect(fab.attributes("aria-controls")).toBe("agent-panel");
    expect(fab.attributes("aria-expanded")).toBe("true");
  });

  it("opens and closes from the global chord, from anywhere on the page", async () => {
    const wrapper = mountLauncher();
    const fab = wrapper.get("button.agent-fab");
    const textarea = makeField("textarea");

    press({ key: "j", metaKey: true });
    await nextTick();
    expect(fab.attributes("aria-expanded")).toBe("true");

    // ...including from inside a composer-like field.
    press({ key: "j", metaKey: true }, textarea);
    await nextTick();
    expect(fab.attributes("aria-expanded")).toBe("false");
  });

  it("passes the open state down to the panel and closes on its close event", async () => {
    const wrapper = mountLauncher();
    await wrapper.get("button.agent-fab").trigger("click");
    const panel = wrapper.findComponent({ name: "AgentPanel" });

    expect(panel.props("open")).toBe(true);

    panel.vm.$emit("close");
    await nextTick();

    expect(panel.props("open")).toBe(false);
  });

  it("advertises the shortcut in the title, resolved for the platform", () => {
    stubNavigator({ userAgentData: { platform: "Windows" } });
    const wrapper = mountLauncher();

    expect(wrapper.get("button.agent-fab").attributes("title")).toBe("Shortcut: Ctrl+J");
  });

  it("interpolates the shortcut through vue-i18n, not through a post-hoc replace", () => {
    // vue-i18n resolves an unsupplied named placeholder to an EMPTY string —
    // it never hands back a literal "{keys}" to replace. The named value has
    // to reach t(), or the translated title loses the shortcut entirely.
    i18nMock.t.mockImplementation((key, params) =>
      key === "agent.shortcutLabel" ? `Raccourci : ${params?.keys ?? ""}` : key,
    );
    stubNavigator({ userAgentData: { platform: "macOS" } });
    const wrapper = mountLauncher();

    expect(i18nMock.t).toHaveBeenCalledWith("agent.shortcutLabel", { keys: "⌘J" });
    expect(wrapper.get("button.agent-fab").attributes("title")).toBe("Raccourci : ⌘J");
  });

  it("falls back to the English default when the key is untranslated", () => {
    // An untranslated key echoes back through t(); the fallback still carries
    // the literal {keys} marker, so the .replace() path stays load-bearing.
    i18nMock.t.mockImplementation((key) => key);
    stubNavigator({ userAgentData: { platform: "Windows" } });
    const wrapper = mountLauncher();

    const title = wrapper.get("button.agent-fab").attributes("title");
    expect(title).toBe("Shortcut: Ctrl+J");
    expect(title).not.toContain("{keys}");
    expect(title).not.toContain("agent.shortcutLabel");
  });

  it("labels the button for both states and hides decorative glyphs", async () => {
    const wrapper = mountLauncher();
    const fab = wrapper.get("button.agent-fab");

    expect(fab.attributes("aria-label")).toBe("Open AI assistant");
    expect(fab.get("svg").attributes("aria-hidden")).toBe("true");

    await fab.trigger("click");

    expect(fab.attributes("aria-label")).toBe("Close AI assistant");
    expect(fab.get("svg").attributes("aria-hidden")).toBe("true");
  });

  describe("styling contract", () => {
    it("keeps the FAB bottom-left at z-index 60 with safe-area padding", () => {
      expect(launcherSource).toContain("z-index: 60;");
      expect(launcherSource).toContain("left: calc(1rem + env(safe-area-inset-left));");
      expect(launcherSource).toContain("bottom: calc(1rem + env(safe-area-inset-bottom));");
      expect(launcherSource).not.toMatch(/\bright:\s*\d/);
    });

    it("keeps the elevation shadow alongside the focus ring", () => {
      const focusRule = launcherSource.match(/\.agent-fab:focus-visible\s*\{[^}]*\}/)[0];

      expect(focusRule).toContain("0 8px 30px rgba(0, 0, 0, 0.18)");
      expect(focusRule).toContain("0 0 0 3px var(--ring-focus)");
      // The unconditional token needs no rgba() fallback.
      expect(launcherSource).not.toContain("var(--ring-focus, rgba");
    });

    it("derives the hover glow from --link instead of a hardcoded accent", () => {
      expect(launcherSource).not.toContain("rgba(0, 229, 153");
      expect(launcherSource).not.toContain("rgba(0,229,153");
      expect(launcherSource).toContain("0 0 18px color-mix(in srgb, var(--link) 25%, transparent)");
    });

    it("hides the FAB below md while the drawer is open", () => {
      expect(launcherSource).toMatch(
        /@media \(max-width: 767px\) \{\s*\.agent-fab-open \{\s*display: none;/,
      );
    });

    it("ships a dark rule and a reduced-motion block", () => {
      expect(launcherSource).toContain(".dark .agent-fab {");
      expect(launcherSource).toContain("rgba(173, 193, 221, 0.05)");
      expect(launcherSource).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{\s*\.agent-fab \{\s*transition: none;/,
      );
    });

    it("uses no v-html anywhere in the launcher", () => {
      expect(launcherSource).not.toContain("v-html");
      expect(launcherSource).not.toContain("innerHTML");
    });
  });
});
