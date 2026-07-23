import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it } from "vitest";
import AgentToolTrail from "@/components/agent/AgentToolTrail.vue";
import trailSource from "@/components/agent/AgentToolTrail.vue?raw";

// The real vue-i18n is used rather than a stub: the plural summary carries an
// `{n}` placeholder, and only the real message compiler proves it interpolates
// (a stubbed `t` would happily pass a label that renders "Used  tools" in prod).
const EN_AGENT_MESSAGES = {
  toolsUsedOne: "Used 1 tool",
  toolsUsedMany: "Used {n} tools",
  toolsNote: "Data was fetched with these explorer tools.",
  model: "Model",
};

const FR_AGENT_MESSAGES = {
  toolsUsedOne: "1 outil utilisé",
  toolsUsedMany: "{n} outils utilisés",
  toolsNote: "Les données ont été récupérées avec ces outils de l'explorateur.",
  model: "Modèle",
};

const wrappers = [];

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

// `agentMessages: null` models the locale-not-yet-translated path, where the
// component must render its English tf() fallbacks instead of raw key names.
function mountTrail(props = {}, agentMessages = null) {
  const wrapper = mount(AgentToolTrail, {
    props,
    global: { plugins: [makeI18n(agentMessages)] },
  });
  wrappers.push(wrapper);
  return wrapper;
}

function toggleButton(wrapper) {
  return wrapper.find(".agent-trail-toggle");
}

function region(wrapper) {
  return wrapper.find(".agent-trail-body");
}

// v-show is asserted through the inline style it actually writes; jsdom has no
// layout, so @vue/test-utils' isVisible() cannot be trusted here.
function regionHidden(wrapper) {
  return region(wrapper).element.style.display === "none";
}

describe("AgentToolTrail", () => {
  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  describe("empty input", () => {
    it("renders nothing when there are no tools and no model", () => {
      const wrapper = mountTrail({ tools: [], model: "" });

      expect(wrapper.find(".agent-tool-trail").exists()).toBe(false);
      expect(wrapper.text()).toBe("");
      expect(wrapper.find("button").exists()).toBe(false);
    });

    it("renders nothing when props are omitted entirely", () => {
      const wrapper = mountTrail();

      expect(wrapper.find(".agent-tool-trail").exists()).toBe(false);
      expect(wrapper.text()).toBe("");
    });

    it("renders nothing when every tool entry is blank and there is no model", () => {
      const wrapper = mountTrail({ tools: ["", "   ", null], model: "  " });

      expect(wrapper.find(".agent-tool-trail").exists()).toBe(false);
      expect(wrapper.text()).toBe("");
    });
  });

  describe("collapsed state", () => {
    it("is collapsed by default with aria-expanded=false", () => {
      const wrapper = mountTrail({ tools: ["get_block", "get_tx"] });

      const button = toggleButton(wrapper);
      expect(button.exists()).toBe(true);
      expect(button.attributes("aria-expanded")).toBe("false");
      expect(regionHidden(wrapper)).toBe(true);
    });

    it("uses the singular summary for exactly one tool", () => {
      const wrapper = mountTrail({ tools: ["get_block"] }, EN_AGENT_MESSAGES);

      expect(toggleButton(wrapper).text()).toContain("Used 1 tool");
    });

    it("interpolates the tool count into a real translated plural message", () => {
      const wrapper = mountTrail(
        { tools: ["get_block", "get_tx", "get_balance"] },
        EN_AGENT_MESSAGES,
      );

      const label = toggleButton(wrapper).text();
      expect(label).toContain("Used 3 tools");
      expect(label).not.toContain("{n}");
      // Regression guard: vue-i18n drops `{n}` when params are not passed
      // through to t(), which would render "Used  tools".
      expect(label).not.toMatch(/Used\s{2,}tools/);
    });

    it("interpolates the tool count in a non-English locale", () => {
      const wrapper = mountTrail({ tools: ["get_block", "get_tx"] }, FR_AGENT_MESSAGES);

      expect(toggleButton(wrapper).text()).toContain("2 outils utilisés");
    });

    it("falls back to the English default with the count filled in when the key is missing", () => {
      const wrapper = mountTrail({ tools: ["get_block", "get_tx", "get_balance"] }, null);

      const label = toggleButton(wrapper).text();
      expect(label).toContain("Used 3 tools");
      expect(label).not.toContain("{n}");
      expect(label).not.toContain("agent.toolsUsedMany");
    });

    it("falls back to the English singular default when the key is missing", () => {
      const wrapper = mountTrail({ tools: ["get_block"] }, null);

      expect(toggleButton(wrapper).text()).toContain("Used 1 tool");
      expect(toggleButton(wrapper).text()).not.toContain("agent.toolsUsedOne");
    });

    it("counts only the tool names it will actually render", () => {
      const wrapper = mountTrail({ tools: ["get_block", "", "  ", "get_tx"] }, EN_AGENT_MESSAGES);

      expect(toggleButton(wrapper).text()).toContain("Used 2 tools");
      expect(wrapper.findAll(".agent-trail-item")).toHaveLength(2);
    });
  });

  describe("expanded state", () => {
    it("flips aria-expanded and reveals the trail on click", async () => {
      const wrapper = mountTrail({ tools: ["get_block", "get_tx"] });
      const button = toggleButton(wrapper);

      await button.trigger("click");

      expect(button.attributes("aria-expanded")).toBe("true");
      expect(regionHidden(wrapper)).toBe(false);

      await button.trigger("click");

      expect(button.attributes("aria-expanded")).toBe("false");
      expect(regionHidden(wrapper)).toBe(true);
    });

    it("lists tools in call order with a 1-based index", async () => {
      const wrapper = mountTrail({ tools: ["get_block", "get_tx", "get_balance"] });

      await toggleButton(wrapper).trigger("click");

      const items = wrapper.findAll(".agent-trail-item");
      expect(items).toHaveLength(3);
      expect(items[0].find(".agent-trail-index").text()).toBe("1.");
      expect(items[0].find(".agent-trail-name").text()).toBe("get_block");
      expect(items[1].find(".agent-trail-index").text()).toBe("2.");
      expect(items[1].find(".agent-trail-name").text()).toBe("get_tx");
      expect(items[2].find(".agent-trail-index").text()).toBe("3.");
      expect(items[2].find(".agent-trail-name").text()).toBe("get_balance");
    });

    it("renders the raw tool name with no label or translation map", async () => {
      const unmapped = "n3_get_application_log_v2";
      const wrapper = mountTrail({ tools: [unmapped] }, {
        ...EN_AGENT_MESSAGES,
        // A label map, if one existed, would win here. It must not.
        tool: { [unmapped]: "Application log" },
      });

      await toggleButton(wrapper).trigger("click");

      expect(wrapper.find(".agent-trail-name").text()).toBe(unmapped);
      expect(wrapper.text()).not.toContain("Application log");
    });

    it("renders the provenance note", async () => {
      const wrapper = mountTrail({ tools: ["get_block"] }, EN_AGENT_MESSAGES);

      await toggleButton(wrapper).trigger("click");

      expect(wrapper.find(".agent-trail-note").text()).toBe(
        "Data was fetched with these explorer tools.",
      );
    });

    it("falls back to the English note when the key is missing", async () => {
      const wrapper = mountTrail({ tools: ["get_block"] }, null);

      await toggleButton(wrapper).trigger("click");

      expect(wrapper.find(".agent-trail-note").text()).toBe(
        "Data was fetched with these explorer tools.",
      );
    });

    it("escapes tool names that look like markup", async () => {
      const hostile = '<img src=x onerror="alert(1)">';
      const wrapper = mountTrail({ tools: [hostile] });

      await toggleButton(wrapper).trigger("click");

      expect(wrapper.find(".agent-trail-name").text()).toBe(hostile);
      expect(wrapper.find("img").exists()).toBe(false);
      expect(wrapper.element.querySelectorAll("script")).toHaveLength(0);
      expect(wrapper.html()).toContain("&lt;img");
    });

    it("escapes a model name that looks like markup", () => {
      const hostile = "<script>alert(1)</script>";
      const wrapper = mountTrail({ tools: [], model: hostile });

      expect(wrapper.find(".agent-trail-model .font-hash").text()).toBe(hostile);
      expect(wrapper.element.querySelectorAll("script")).toHaveLength(0);
    });
  });

  describe("model", () => {
    it("shows the model inside the expanded trail when tools are present", async () => {
      const wrapper = mountTrail(
        { tools: ["get_block"], model: "deepseek-chat" },
        EN_AGENT_MESSAGES,
      );

      await toggleButton(wrapper).trigger("click");

      const modelLine = region(wrapper).find(".agent-trail-model");
      expect(modelLine.exists()).toBe(true);
      expect(modelLine.text()).toContain("Model");
      expect(modelLine.text()).toContain("deepseek-chat");
      expect(modelLine.find(".font-hash").text()).toBe("deepseek-chat");
    });

    it("omits the model line when the model is empty", async () => {
      const wrapper = mountTrail({ tools: ["get_block"], model: "" });

      await toggleButton(wrapper).trigger("click");

      expect(region(wrapper).find(".agent-trail-model").exists()).toBe(false);
    });

    it("renders a flat model line with no toggle when there are no tools", () => {
      const wrapper = mountTrail({ tools: [], model: "deepseek-chat" }, EN_AGENT_MESSAGES);

      expect(wrapper.find(".agent-tool-trail").exists()).toBe(true);
      expect(toggleButton(wrapper).exists()).toBe(false);
      expect(region(wrapper).exists()).toBe(false);
      const modelLine = wrapper.find(".agent-trail-model");
      expect(modelLine.text()).toContain("Model");
      expect(modelLine.text()).toContain("deepseek-chat");
    });

    it("degrades cleanly when the service omits the model field", () => {
      const wrapper = mountTrail({ tools: ["get_block"], model: undefined });

      expect(toggleButton(wrapper).exists()).toBe(true);
      expect(wrapper.find(".agent-trail-model").exists()).toBe(false);
    });
  });

  describe("accessibility", () => {
    it("uses a real button so it is keyboard operable", () => {
      const wrapper = mountTrail({ tools: ["get_block"] });
      const button = toggleButton(wrapper);

      expect(button.element.tagName).toBe("BUTTON");
      expect(button.attributes("type")).toBe("button");
      expect(button.attributes("disabled")).toBeUndefined();
    });

    it("points aria-controls at a region that exists even while collapsed", () => {
      const wrapper = mountTrail({ tools: ["get_block"] });

      const controls = toggleButton(wrapper).attributes("aria-controls");
      expect(controls).toBeTruthy();
      expect(regionHidden(wrapper)).toBe(true);
      expect(region(wrapper).attributes("id")).toBe(controls);
      expect(wrapper.element.querySelector(`[id="${controls}"]`)).not.toBeNull();
    });

    it("gives every instance in the transcript a distinct region id", () => {
      const wrapper = mount(
        {
          components: { AgentToolTrail },
          template: `
            <div>
              <AgentToolTrail :tools="['get_block']" />
              <AgentToolTrail :tools="['get_tx']" />
              <AgentToolTrail :tools="['get_balance']" />
            </div>
          `,
        },
        { global: { plugins: [makeI18n(EN_AGENT_MESSAGES)] } },
      );
      wrappers.push(wrapper);

      const ids = wrapper
        .findAll(".agent-trail-toggle")
        .map((button) => button.attributes("aria-controls"));

      expect(ids).toHaveLength(3);
      expect(ids.every(Boolean)).toBe(true);
      expect(new Set(ids).size).toBe(3);
    });

    it("hides the decorative chevron from assistive technology", () => {
      const wrapper = mountTrail({ tools: ["get_block"] });

      expect(wrapper.find(".agent-trail-chevron").attributes("aria-hidden")).toBe("true");
    });

    it("emits no component events when toggled", async () => {
      const wrapper = mountTrail({ tools: ["get_block"] });

      await toggleButton(wrapper).trigger("click");

      // The only recorded entry is the native DOM click that bubbled to the root.
      expect(Object.keys(wrapper.emitted())).toEqual(["click"]);
      expect(AgentToolTrail.emits).toBeUndefined();
    });
  });

  describe("source guarantees", () => {
    it("never renders model-derived text through an HTML sink", () => {
      expect(trailSource).not.toMatch(/v-html/);
      expect(trailSource).not.toMatch(/innerHTML/);
      expect(trailSource).not.toMatch(/new Function/);
    });

    it("declares no emits and no slots", () => {
      expect(trailSource).not.toContain("defineEmits");
      expect(trailSource).not.toContain("$emit");
      expect(trailSource).not.toContain("<slot");
    });

    it("reserves a >=24px hit target for the toggle", () => {
      expect(trailSource).toMatch(/\.agent-trail-toggle\s*\{[^}]*min-height:\s*1\.5rem/);
    });

    it("ships a reduced-motion block", () => {
      expect(trailSource).toContain("@media (prefers-reduced-motion: reduce)");
      expect(trailSource).toMatch(
        /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.agent-trail-chevron\s*\{[^}]*transition:\s*none/,
      );
    });

    it("ships an explicit dark rule for its bespoke surface", () => {
      expect(trailSource).toMatch(/\.dark \.agent-trail-body\s*\{[^}]*border-left-color/);
    });

    it("draws colour from tokens only, never literal hex", () => {
      const styles = trailSource.slice(trailSource.indexOf("<style"));
      expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(styles).toContain("var(--line-soft)");
    });

    it("only uses contract i18n keys", () => {
      const keys = [...trailSource.matchAll(/tf\("([^"]+)"/g)].map((match) => match[1]);
      expect(new Set(keys)).toEqual(
        new Set(["agent.toolsUsedOne", "agent.toolsUsedMany", "agent.toolsNote", "agent.model"]),
      );
    });
  });
});
