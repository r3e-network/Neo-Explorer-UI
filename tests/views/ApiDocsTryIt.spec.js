import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

import ApiDocs from "@/views/Developer/ApiDocs.vue";
import { READ_API_BASE } from "@/constants/readApiDocs.mjs";
import { setCurrentEnv } from "@/utils/env";

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

async function selectRestCategory(wrapper, label) {
  const button = wrapper.findAll("button").find((candidate) => candidate.text() === label);
  if (!button) throw new Error(`category button not found: ${label}`);
  await button.trigger("click");
  await wrapper.vm.$nextTick();
}

async function switchToRpcMode(wrapper) {
  const rpcButton = wrapper.findAll("button").find((button) => button.text().includes("apiDocsPage.modeRpc"));
  if (!rpcButton) throw new Error("RPC mode button not found");
  await rpcButton.trigger("click");
  await wrapper.vm.$nextTick();
}

describe("ApiDocs REST try-it console", () => {
  beforeEach(() => {
    setCurrentEnv("Mainnet");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setCurrentEnv("Mainnet");
  });

  it("lets users run a documented REST endpoint and inspect the JSON response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ index: 1122 }], ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mountApiDocs();
    await selectRestCategory(wrapper, "Blocks");
    const card = wrapper
      .findAll('[data-testid="api-docs-rest-endpoint"]')
      .find((candidate) => candidate.text().includes("/v1/networks/{network}/blocks"));

    expect(card).toBeTruthy();
    await card.find('[data-testid="api-try-query-limit"]').setValue("2");
    await card.find('[data-testid="api-try-run"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      `${READ_API_BASE}/v1/networks/mainnet/blocks?limit=2`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
    expect(card.find('[data-testid="api-try-result"]').text()).toContain('"ok": true');
    expect(card.find('[data-testid="api-try-status"]').text()).toContain("200");
  });

  it("lets users run a documented JSON-RPC method and inspect the JSON response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: 1122 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mountApiDocs();
    await switchToRpcMode(wrapper);
    const card = wrapper
      .findAll('[data-testid="api-docs-rpc-method"]')
      .find((candidate) => candidate.text().includes("getblockcount"));

    expect(card).toBeTruthy();
    await card.find('[data-testid="api-rpc-try-run"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rpc/mainnet"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: expect.stringContaining('"method":"getblockcount"'),
      }),
    );
    expect(card.find('[data-testid="api-rpc-try-result"]').text()).toContain('"result": 1122');
    expect(card.find('[data-testid="api-rpc-try-status"]').text()).toContain("200");
  });
});
