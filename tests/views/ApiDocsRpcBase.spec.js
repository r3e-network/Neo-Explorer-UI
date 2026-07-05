import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

import ApiDocs from "@/views/Developer/ApiDocs.vue";
import { API_DOCS_RPC_CATEGORIES, API_DOCS_RPC_METHODS } from "@/constants/rpcApiDocs.mjs";
import { setCurrentEnv } from "@/utils/env";

// Interactive JSON-RPC docs list production-runnable standard Neo RPC methods.
// Indexed explorer data is documented in REST mode instead.

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

describe("ApiDocs JSON-RPC base routing", () => {
  beforeEach(() => {
    setCurrentEnv("Mainnet");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setCurrentEnv("Mainnet");
  });

  it("renders stats methods against the /rpc origin-proxy without a mainnet-only note", async () => {
    const wrapper = mountApiDocs();
    await switchToRpcMode(wrapper);
    await selectCategory(wrapper, "stats");

    const endpoints = wrapper.findAll('[data-testid="rpc-method-endpoint"]').map((n) => n.text());
    expect(endpoints.length).toBeGreaterThan(0);
    expect(endpoints.every((text) => text.includes("/rpc/mainnet"))).toBe(true);
    expect(endpoints.some((text) => text.includes("/api/mainnet"))).toBe(false);
    expect(wrapper.find('[data-testid="rpc-mainnet-only-badge"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="rpc-mainnet-only-note"]').exists()).toBe(false);
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

  it("does not render legacy indexed methods as runnable JSON-RPC cards", async () => {
    expect(API_DOCS_RPC_METHODS.some((method) => method.type === "indexed")).toBe(false);
    expect(API_DOCS_RPC_METHODS.some((method) => /^Get/.test(method.name))).toBe(false);
  });

  it("uses the /rpc base for every rendered method card", async () => {
    const wrapper = mountApiDocs();
    await switchToRpcMode(wrapper);

    for (const { key } of API_DOCS_RPC_CATEGORIES) {
      await selectCategory(wrapper, key);
      const cards = wrapper.findAll("article.etherscan-card");
      for (const card of cards) {
        const name = card.find("h3").text();
        const endpoint = card.find('[data-testid="rpc-method-endpoint"]').text();
        expect(endpoint, name).toContain("/rpc/mainnet");
        expect(endpoint, name).not.toContain("/api/mainnet");
      }
    }
  });
});
