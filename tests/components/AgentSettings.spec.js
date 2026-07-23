import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

// tf(key, fallback) falls back to the shipped English copy when a key is
// missing; stubbing t to echo the key makes every label render its fallback,
// so the assertions below check the exact contract strings.
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

// useAgentSettings is a module-level singleton. We replace it with a reactive
// stand-in whose setters are spies that ALSO mutate real refs, so we can both
// assert "the component wrote through setX" and drive the reactive UI (toggling
// mode reveals the byok fields). `bag` exposes the refs/spies to the test and a
// reset() to wipe state between cases so nothing bleeds.
const bag = vi.hoisted(() => ({}));

vi.mock("@/composables/useAgentSettings", async () => {
  const { ref, computed } = await import("vue");

  const mode = ref("hosted");
  const model = ref("");
  const baseUrl = ref("");
  const apiKey = ref("");
  const rememberKey = ref(false);

  const isByokReady = computed(() => mode.value === "byok" && apiKey.value.trim() !== "");
  const activeMode = computed(() => (isByokReady.value ? "byok" : "hosted"));

  const setMode = vi.fn((next) => {
    mode.value = next;
  });
  const setModel = vi.fn((next) => {
    model.value = typeof next === "string" ? next : "";
  });
  const setBaseUrl = vi.fn((next) => {
    baseUrl.value = next;
  });
  const setApiKey = vi.fn((next) => {
    apiKey.value = typeof next === "string" ? next : "";
  });
  const setRememberKey = vi.fn((next) => {
    rememberKey.value = next === true;
  });
  const clearKey = vi.fn(() => {
    apiKey.value = "";
  });

  const useAgentSettings = () => ({
    mode,
    model,
    baseUrl,
    apiKey,
    rememberKey,
    isByokReady,
    activeMode,
    setMode,
    setModel,
    setBaseUrl,
    setApiKey,
    setRememberKey,
    clearKey,
  });

  bag.refs = { mode, model, baseUrl, apiKey, rememberKey };
  bag.fns = { setMode, setModel, setBaseUrl, setApiKey, setRememberKey, clearKey };
  bag.reset = () => {
    mode.value = "hosted";
    model.value = "";
    baseUrl.value = "";
    apiKey.value = "";
    rememberKey.value = false;
  };

  return {
    useAgentSettings,
    default: useAgentSettings,
    ALLOWED_BASE_URLS: ["https://api.deepseek.com/anthropic", "https://api.anthropic.com"],
    AGENT_SETTINGS_STORAGE_KEY: "neo_explorer_agent_settings",
    AGENT_BYOK_KEY_STORAGE_KEY: "neo_explorer_agent_byok_key",
  };
});

import AgentSettings from "@/components/agent/AgentSettings.vue";
import { ALLOWED_BASE_URLS } from "@/composables/useAgentSettings";

const NO_STORE = "We never store your key; it is sent per request and not logged.";
const REMEMBER_HELP =
  "Off: kept only for this browser tab. On: stored on this device — avoid on shared computers.";

let wrapper;

function makeWrapper(props = {}) {
  return mount(AgentSettings, {
    props: { open: true, ...props },
    attachTo: document.body,
  });
}

// Enter BYOK mode before mount so the byok fields are present from the first
// render, for cases that are not themselves about the mode toggle.
function makeByokWrapper(props = {}) {
  bag.refs.mode.value = "byok";
  return makeWrapper(props);
}

function buttonWithText(text) {
  return wrapper.findAll("button").find((node) => node.text().trim() === text);
}

function keyInput() {
  return wrapper.find(".agent-settings-key-row input");
}

beforeEach(() => {
  // Re-read the singleton from a clean slate: reset its refs, drop any persisted
  // storage, and wipe recorded setter calls so cases cannot bleed into one another.
  bag.reset();
  vi.clearAllMocks();
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Storage is best-effort in restricted contexts; the mock keeps state anyway.
  }
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.replaceChildren();
});

describe("AgentSettings", () => {
  describe("visibility", () => {
    it("renders nothing when closed", () => {
      wrapper = makeWrapper({ open: false });
      expect(wrapper.find(".agent-settings").exists()).toBe(false);
    });

    it("renders the panel with its title when open", () => {
      wrapper = makeWrapper();
      expect(wrapper.find(".agent-settings").exists()).toBe(true);
      expect(wrapper.text()).toContain("Assistant settings");
      expect(wrapper.text()).toContain("Model access");
    });
  });

  describe("mode segmented control", () => {
    it("shows hosted as the active option and its help by default", () => {
      wrapper = makeWrapper();
      const hosted = buttonWithText("Hosted (default)");
      const byok = buttonWithText("Use your own key");
      expect(hosted.attributes("aria-pressed")).toBe("true");
      expect(byok.attributes("aria-pressed")).toBe("false");
      expect(hosted.classes()).toContain("tab-btn-active");
      expect(wrapper.text()).toContain("Uses this site's assistant. No setup needed.");
    });

    it("does not render the byok fields while hosted", () => {
      wrapper = makeWrapper();
      expect(wrapper.find(".agent-settings-byok").exists()).toBe(false);
      expect(keyInput().exists()).toBe(false);
    });

    it("calls setMode('byok') and reveals the byok fields when the byok tab is clicked", async () => {
      wrapper = makeWrapper();
      await buttonWithText("Use your own key").trigger("click");
      expect(bag.fns.setMode).toHaveBeenCalledTimes(1);
      expect(bag.fns.setMode).toHaveBeenCalledWith("byok");
      expect(wrapper.find(".agent-settings-byok").exists()).toBe(true);
      expect(keyInput().exists()).toBe(true);
      // The byok help replaces the hosted help.
      expect(wrapper.text()).toContain(
        "Runs on your own LLM account. Your key is sent with each request and never stored on our servers.",
      );
    });

    it("calls setMode('hosted') when the hosted tab is clicked from byok", async () => {
      wrapper = makeByokWrapper();
      await buttonWithText("Hosted (default)").trigger("click");
      expect(bag.fns.setMode).toHaveBeenCalledTimes(1);
      expect(bag.fns.setMode).toHaveBeenCalledWith("hosted");
      expect(wrapper.find(".agent-settings-byok").exists()).toBe(false);
    });
  });

  describe("api key input", () => {
    it("masks the key by default (type=password)", () => {
      wrapper = makeByokWrapper();
      expect(keyInput().attributes("type")).toBe("password");
    });

    it("writes each edit through setApiKey", async () => {
      wrapper = makeByokWrapper();
      await keyInput().setValue("sk-user-abc123");
      expect(bag.fns.setApiKey).toHaveBeenCalledWith("sk-user-abc123");
      // The value is reflected back from the singleton, never held locally.
      expect(keyInput().element.value).toBe("sk-user-abc123");
    });

    it("flips the input type and the toggle label with show/hide", async () => {
      wrapper = makeByokWrapper();
      expect(keyInput().attributes("type")).toBe("password");

      await buttonWithText("Show").trigger("click");
      expect(keyInput().attributes("type")).toBe("text");
      expect(buttonWithText("Hide")).toBeTruthy();
      expect(buttonWithText("Show")).toBeUndefined();

      await buttonWithText("Hide").trigger("click");
      expect(keyInput().attributes("type")).toBe("password");
      expect(buttonWithText("Show")).toBeTruthy();
    });

    it("clears the key through clearKey and re-masks", async () => {
      wrapper = makeByokWrapper();
      await keyInput().setValue("sk-user-abc123");
      await buttonWithText("Show").trigger("click");
      expect(keyInput().attributes("type")).toBe("text");

      await buttonWithText("Clear key").trigger("click");
      expect(bag.fns.clearKey).toHaveBeenCalledTimes(1);
      await nextTick();
      // Cleared value and re-masked field.
      expect(keyInput().element.value).toBe("");
      expect(keyInput().attributes("type")).toBe("password");
    });

    it("disables Clear while the key is empty", async () => {
      wrapper = makeByokWrapper();
      expect(buttonWithText("Clear key").attributes("disabled")).toBeDefined();
      await keyInput().setValue("sk-user-abc123");
      expect(buttonWithText("Clear key").attributes("disabled")).toBeUndefined();
    });
  });

  describe("model input", () => {
    it("writes edits through setModel", async () => {
      wrapper = makeByokWrapper();
      const modelField = wrapper.find('input[placeholder="provider default"]');
      expect(modelField.exists()).toBe(true);
      await modelField.setValue("deepseek-chat");
      expect(bag.fns.setModel).toHaveBeenCalledWith("deepseek-chat");
    });
  });

  describe("provider (base URL) select", () => {
    it("offers exactly the default plus the allowlist, in order", () => {
      wrapper = makeByokWrapper();
      const options = wrapper.findAll(".agent-settings-select option");
      expect(options.map((o) => o.attributes("value"))).toEqual(["", ...ALLOWED_BASE_URLS]);
      expect(options).toHaveLength(3);
      expect(options[0].text()).toBe("Default (DeepSeek)");
      expect(options[1].text()).toBe("https://api.deepseek.com/anthropic");
      expect(options[2].text()).toBe("https://api.anthropic.com");
    });

    it("writes the chosen provider through setBaseUrl", async () => {
      wrapper = makeByokWrapper();
      await wrapper.find(".agent-settings-select").setValue("https://api.anthropic.com");
      expect(bag.fns.setBaseUrl).toHaveBeenCalledWith("https://api.anthropic.com");
    });

    it("reflects the persisted provider back into the select", () => {
      bag.refs.baseUrl.value = "https://api.anthropic.com";
      wrapper = makeByokWrapper();
      expect(wrapper.find(".agent-settings-select").element.value).toBe("https://api.anthropic.com");
    });
  });

  describe("remember-on-this-device", () => {
    it("writes the checkbox through setRememberKey and renders the caveat", async () => {
      wrapper = makeByokWrapper();
      const checkbox = wrapper.find('input[type="checkbox"]');
      expect(checkbox.exists()).toBe(true);
      expect(checkbox.element.checked).toBe(false);
      expect(wrapper.text()).toContain(REMEMBER_HELP);

      await checkbox.setValue(true);
      expect(bag.fns.setRememberKey).toHaveBeenCalledWith(true);
      expect(checkbox.element.checked).toBe(true);

      await checkbox.setValue(false);
      expect(bag.fns.setRememberKey).toHaveBeenCalledWith(false);
    });
  });

  describe("no-store reassurance", () => {
    it("renders the no-store line in byok mode", () => {
      wrapper = makeByokWrapper();
      expect(wrapper.find(".agent-settings-nostore").text()).toBe(NO_STORE);
    });

    it("does not show the reassurance while hosted", () => {
      wrapper = makeWrapper();
      expect(wrapper.find(".agent-settings-nostore").exists()).toBe(false);
    });
  });

  describe("done", () => {
    it("emits close when Done is clicked", async () => {
      wrapper = makeWrapper();
      await buttonWithText("Done").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });
  });

  describe("write-through discipline", () => {
    it("never mutates settings state except through the exposed setters", async () => {
      wrapper = makeByokWrapper();
      await keyInput().setValue("sk-secret");
      await wrapper.find(".agent-settings-select").setValue("https://api.deepseek.com/anthropic");
      await wrapper.find('input[type="checkbox"]').setValue(true);
      // Every state change routed through a spy; no direct ref writes.
      expect(bag.fns.setApiKey).toHaveBeenCalled();
      expect(bag.fns.setBaseUrl).toHaveBeenCalled();
      expect(bag.fns.setRememberKey).toHaveBeenCalled();
    });
  });
});
