import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeAll } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import realRouter from "@/router";
import AgentRichText from "@/components/agent/AgentRichText.vue";

const N3_ADDRESS = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
const EVM_ADDRESS = `0x${"ab".repeat(20)}`;
const HASH_32 = `0x${"cd".repeat(32)}`;

const TARGET_NAMES = new Set([
  "accountProfile",
  "xAddress",
  "transactionDetail",
  "xTxDetail",
  "blockDetail",
  "xBlockDetail",
]);

const Blank = { name: "Blank", template: "<div />" };

/**
 * Builds a lightweight router from the *real* route paths so hrefs are asserted
 * against production routing, without pulling every lazy view into the test.
 */
function collectRealRoutes(routes, acc = []) {
  for (const route of routes) {
    if (route.name && TARGET_NAMES.has(route.name) && route.path.startsWith("/")) {
      acc.push({ path: route.path, name: route.name, component: Blank });
    }
    if (route.children) collectRealRoutes(route.children, acc);
  }
  return acc;
}

let router;

beforeAll(async () => {
  const routes = collectRealRoutes(realRouter.options.routes);
  expect(routes).toHaveLength(TARGET_NAMES.size);
  router = createRouter({
    history: createMemoryHistory(),
    routes: [...routes, { path: "/:pathMatch(.*)*", name: "blank", component: Blank }],
  });
  router.push("/");
  await router.isReady();
});

const mountRich = (props) =>
  mount(AgentRichText, { props, global: { plugins: [router] } });

describe("AgentRichText — block rendering", () => {
  it("renders paragraphs, headings, lists and code blocks as real elements", () => {
    const wrapper = mountRich({
      text: "# Title\n\nA paragraph.\n\n- one\n- two\n\n1. first\n\n```js\nconst a = 1;\n```",
    });

    expect(wrapper.find("h3").text()).toBe("Title");
    expect(wrapper.find("p").text()).toBe("A paragraph.");
    expect(wrapper.findAll("ul li").map((li) => li.text())).toEqual(["one", "two"]);
    expect(wrapper.findAll("ol li").map((li) => li.text())).toEqual(["first"]);
    expect(wrapper.find("pre code").text()).toBe("const a = 1;");
    expect(wrapper.find("pre code").attributes("data-lang")).toBe("js");
  });

  it("maps heading levels to h3/h4/h5 below the panel title", () => {
    const wrapper = mountRich({ text: "# a\n\n## b\n\n### c" });
    expect(wrapper.find("h3").exists()).toBe(true);
    expect(wrapper.find("h4").exists()).toBe(true);
    expect(wrapper.find("h5").exists()).toBe(true);
  });

  it("renders inline emphasis and code", () => {
    const wrapper = mountRich({ text: "plain **bold** *italic* `mono`" });
    expect(wrapper.find("strong").text()).toBe("bold");
    expect(wrapper.find("em").text()).toBe("italic");
    expect(wrapper.find("code").text()).toBe("mono");
    expect(wrapper.find("code").classes()).toContain("font-hash");
  });

  it("keeps long code inside its own horizontally scrollable container", () => {
    const wrapper = mountRich({ text: `\`\`\`\n${"x".repeat(400)}\n\`\`\`` });
    const pre = wrapper.find("pre");
    expect(pre.classes()).toContain("agent-rich-pre");
    expect(pre.find("code").text()).toHaveLength(400);
  });

  it("renders an empty container for blank text", () => {
    const wrapper = mountRich({ text: "   " });
    expect(wrapper.find(".agent-rich").exists()).toBe(true);
    expect(wrapper.find(".agent-rich").element.children).toHaveLength(0);
  });

  it("carries the scoped-style id onto every rendered node", () => {
    // The component renders through h(); if the scope id ever stopped being
    // applied, the whole <style scoped> block would silently stop matching.
    const wrapper = mountRich({ text: "para\n\n- item\n\n```\ncode\n```" });
    const nodes = [wrapper.element, ...wrapper.element.querySelectorAll("*")];
    for (const el of nodes) {
      const scoped = Array.from(el.attributes).some((a) => a.name.startsWith("data-v-"));
      expect(scoped, `${el.tagName} is missing its scope id`).toBe(true);
    }
  });

  it("re-renders when the text prop changes", async () => {
    const wrapper = mountRich({ text: "first" });
    expect(wrapper.text()).toBe("first");
    await wrapper.setProps({ text: "- second" });
    expect(wrapper.find("li").text()).toBe("second");
  });
});

describe("AgentRichText — untrusted model output stays inert", () => {
  const payloads = [
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    "[click](javascript:alert(1))",
    '<div onclick="steal()">hi</div>',
    '<a href="https://evil.example">airdrop</a>',
    "<svg/onload=alert(1)>",
    "Claim your airdrop at https://evil.example now",
  ];

  it.each(payloads)("renders %s as visible literal text with no elements", (payload) => {
    const wrapper = mountRich({ text: payload });

    // The user sees exactly what the model wrote…
    expect(wrapper.text()).toContain(payload);
    // …inside a single block wrapper and nothing else.
    const container = wrapper.find(".agent-rich").element;
    expect(container.children).toHaveLength(1);
    expect(container.children[0].tagName).toBe("P");
    expect(container.children[0].children).toHaveLength(0);

    // No markup was interpreted.
    expect(wrapper.find("script").exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("iframe").exists()).toBe(false);
    expect(wrapper.find("svg").exists()).toBe(false);
    expect(wrapper.findAll("a")).toHaveLength(0);
  });

  it("never emits an href or an event-handler attribute for hostile input", () => {
    const wrapper = mountRich({ text: payloads.join("\n\n") });
    const elements = [wrapper.element, ...wrapper.element.querySelectorAll("*")];
    for (const el of elements) {
      for (const attr of Array.from(el.attributes)) {
        expect(attr.name.toLowerCase()).not.toBe("href");
        expect(attr.name.toLowerCase().startsWith("on")).toBe(false);
      }
    }
  });

  it("escapes angle brackets in the serialized markup", () => {
    const wrapper = mountRich({ text: "<script>alert(1)</script>" });
    expect(wrapper.html()).toContain("&lt;script&gt;");
    expect(wrapper.html()).not.toContain("<script>");
  });

  it("does not linkify bare or markdown-wrapped external URLs", () => {
    const wrapper = mountRich({
      text: "See https://evil.example and [here](https://evil.example/x)",
    });
    expect(wrapper.findAll("a")).toHaveLength(0);
    expect(wrapper.text()).toContain("https://evil.example");
  });
});

describe("AgentRichText — entity linking", () => {
  const cases = [
    { chain: "n3", text: N3_ADDRESS, href: `/account-profile/${N3_ADDRESS}` },
    { chain: "both", text: N3_ADDRESS, href: `/account-profile/${N3_ADDRESS}` },
    { chain: "neox", text: EVM_ADDRESS, href: `/x/address/${EVM_ADDRESS}` },
    { chain: "n3", text: HASH_32, href: `/transaction-info/${HASH_32}` },
    { chain: "neox", text: HASH_32, href: `/x/tx/${HASH_32}` },
    { chain: "n3", text: "block 1234", href: "/block-info/1234" },
    { chain: "neox", text: "block #1234", href: "/x/block-info/1234" },
  ];

  it.each(cases)("links $text on $chain to $href", ({ chain, text, href }) => {
    const wrapper = mountRich({ text, chain });
    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe(href);
    expect(link.classes()).toEqual(expect.arrayContaining(["etherscan-link", "font-hash"]));
  });

  it("never produces the /transaction/ redirect path for a hash", () => {
    const wrapper = mountRich({ text: HASH_32, chain: "n3" });
    expect(wrapper.find("a").attributes("href")).not.toMatch(/^\/transaction\//);
  });

  const ambiguous = [
    { chain: "neox", text: N3_ADDRESS },
    { chain: "n3", text: EVM_ADDRESS },
    { chain: "both", text: EVM_ADDRESS },
    { chain: "both", text: HASH_32 },
    { chain: "both", text: "block 99" },
  ];

  it.each(ambiguous)("renders $text as plain selectable text on $chain", ({ chain, text }) => {
    const wrapper = mountRich({ text, chain });
    expect(wrapper.findAll("a")).toHaveLength(0);
    const span = wrapper.find("span.agent-rich-entity");
    expect(span.exists()).toBe(true);
    expect(span.classes()).toContain("font-hash");
    expect(wrapper.text()).toContain(text.replace(/^block #?/, ""));
  });

  it("falls back to n3 targets for an unknown chain value", () => {
    const wrapper = mountRich({ text: HASH_32, chain: "dogecoin" });
    expect(wrapper.find("a").attributes("href")).toBe(`/transaction-info/${HASH_32}`);
  });

  it("renders no links at all when linkEntities is false", () => {
    const wrapper = mountRich({
      text: `${N3_ADDRESS} ${HASH_32} block 12`,
      chain: "n3",
      linkEntities: false,
    });
    expect(wrapper.findAll("a")).toHaveLength(0);
    expect(wrapper.findAll("span.agent-rich-entity")).toHaveLength(3);
  });

  it("keeps the prose around a block reference and links only the number", () => {
    const wrapper = mountRich({ text: "Look at block #77 please", chain: "n3" });
    expect(wrapper.text()).toBe("Look at block #77 please");
    expect(wrapper.find("a").text()).toBe("77");
  });

  it("does not link entities that appear inside code", () => {
    const wrapper = mountRich({ text: `\`${HASH_32}\``, chain: "n3" });
    expect(wrapper.findAll("a")).toHaveLength(0);
    expect(wrapper.find("code").text()).toBe(HASH_32);
  });
});

describe("AgentRichText — security invariants in source", () => {
  const files = [
    "src/utils/agentMarkdown.js",
    "src/components/agent/AgentRichText.vue",
  ];

  it.each(files)("%s contains no HTML-string escape hatch", (file) => {
    const source = readFileSync(resolvePath(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/v-html/);
    expect(source).not.toMatch(/innerHTML/);
    expect(source).not.toMatch(/outerHTML/);
    expect(source).not.toMatch(/insertAdjacentHTML/);
    expect(source).not.toMatch(/dangerouslySetInnerHTML/);
    expect(source).not.toMatch(/new\s+Function/);
    expect(source).not.toMatch(/\beval\s*\(/);
  });
});
