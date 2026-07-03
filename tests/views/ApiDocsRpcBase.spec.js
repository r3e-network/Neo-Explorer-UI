import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

import ApiDocs from "@/views/Developer/ApiDocs.vue";
import {
  API_DOCS_RPC_METHODS,
  RPC_MAINNET_ONLY_BADGE,
} from "@/constants/rpcApiDocs.mjs";
import { setCurrentEnv } from "@/utils/env";

// #18: the ApiDocs JSON-RPC cards must send the indexed Get* methods and the
// getvalidatedstateroot helper to the /api/<network> intercept base, while the
// standard NEO-GO methods (invokefunction) stay on the /rpc origin-proxy.

const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackWarn: false,
  missingWarn: false,
  messages: { en: {} },
});

function mountApiDocs() {
  return mount(ApiDocs, {
    global: {
      plugins: [i18n],
      stubs: { Breadcrumb: true },
    },
  });
}

async function switchToRpcMode(wrapper) {
  // The mode switcher button order: [REST, JSON-RPC]. Click the second.
  const buttons = wrapper.findAll("button");
  const rpcButton = buttons.find((b) => b.text().includes("apiDocsPage.modeRpc"));
  await rpcButton.trigger("click");
  await wrapper.vm.$nextTick();
}

async function selectCategory(wrapper, categoryKey) {
  // In RPC mode the category buttons render the i18n key as their label
  // (missing translations resolve to the key with our empty message bundle),
  // e.g. "apiDocsPage.categories.stats". Click the matching button rather than
  // mutating the <script setup> binding directly.
  const label = `apiDocsPage.categories.${categoryKey}`;
  const buttons = wrapper.findAll("button");
  const target = buttons.find((b) => b.text() === label);
  if (!target) throw new Error(`category button not found for ${categoryKey}`);
  await target.trigger("click");
  await wrapper.vm.$nextTick();
}

describe("ApiDocs JSON-RPC base routing (#18)", () => {
  beforeEach(() => {
    setCurrentEnv("Mainnet");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setCurrentEnv("Mainnet");
  });

  it("renders getvalidatedstateroot against the /api intercept base with a mainnet-only note", async () => {
    const wrapper = mountApiDocs();
    await switchToRpcMode(wrapper);
    // getvalidatedstateroot lives in the "stats" category.
    await selectCategory(wrapper, "stats");

    const endpoints = wrapper.findAll('[data-testid="rpc-method-endpoint"]').map((n) => n.text());
    // At least one card in this category (getvalidatedstateroot) targets /api.
    expect(endpoints.some((text) => text.includes("/api/mainnet"))).toBe(true);
    expect(endpoints.every((text) => !text.includes("/rpc/mainnet"))).toBe(true);

    // The mainnet-only annotation is present for the /api group.
    const badges = wrapper.findAll('[data-testid="rpc-mainnet-only-badge"]').map((n) => n.text());
    expect(badges).toContain(RPC_MAINNET_ONLY_BADGE);
    expect(wrapper.find('[data-testid="rpc-mainnet-only-note"]').exists()).toBe(true);
  });

  it("keeps standard NEO-GO methods (invokefunction) on the /rpc origin-proxy without a mainnet-only note", async () => {
    const wrapper = mountApiDocs();
    await switchToRpcMode(wrapper);
    // invokefunction lives in the "contracts" category.
    await selectCategory(wrapper, "contracts");

    // Find the invokefunction card by its mono <h3> title.
    const cards = wrapper.findAll("article.etherscan-card");
    const invokeCard = cards.find((card) => card.text().includes("invokefunction"));
    expect(invokeCard).toBeTruthy();

    const endpoint = invokeCard.find('[data-testid="rpc-method-endpoint"]').text();
    expect(endpoint).toContain("/rpc/mainnet");
    expect(endpoint).not.toContain("/api/mainnet");
    // No mainnet-only badge/note on a standard /rpc method.
    expect(invokeCard.find('[data-testid="rpc-mainnet-only-badge"]').exists()).toBe(false);
    expect(invokeCard.find('[data-testid="rpc-mainnet-only-note"]').exists()).toBe(false);
  });

  it("uses the /api base for every indexed method card in the rendered doc", async () => {
    const wrapper = mountApiDocs();
    await switchToRpcMode(wrapper);

    const indexedByCategory = new Map();
    for (const method of API_DOCS_RPC_METHODS.filter((m) => m.type === "indexed")) {
      if (!indexedByCategory.has(method.category)) indexedByCategory.set(method.category, []);
      indexedByCategory.get(method.category).push(method.name);
    }

    for (const [category, names] of indexedByCategory.entries()) {
      await selectCategory(wrapper, category);
      const cards = wrapper.findAll("article.etherscan-card");
      for (const name of names) {
        const card = cards.find((c) => c.find("h3").text() === name);
        expect(card, `card for ${name}`).toBeTruthy();
        const endpoint = card.find('[data-testid="rpc-method-endpoint"]').text();
        expect(endpoint, name).toContain("/api/mainnet");
      }
    }
  });
});
