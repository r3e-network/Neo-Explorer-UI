import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBlockscout } from "../../src/services/neox/blockscoutClient.js";

const jsonResponse = (payload) =>
  new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [] })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("neox blockscoutClient URL building", () => {
  it("echoes cursor null members as the literal string, verbatim like Blockscout's frontend", async () => {
    // /addresses cursors carry transactions_count: null — dropping the key
    // makes the upstream silently serve page one again (regression test).
    await fetchBlockscout("neox-mainnet", "addresses", {
      params: { hash: "0xabc", fetched_coin_balance: "123", transactions_count: null, items_count: 50 },
    });
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toContain("transactions_count=null");
    expect(url).toContain("hash=0xabc");
    expect(url).toContain("items_count=50");
  });

  it("still drops undefined and empty-string params", async () => {
    await fetchBlockscout("neox-mainnet", "blocks", { params: { a: undefined, b: "", c: "1" } });
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toContain("c=1");
    expect(url).not.toContain("a=");
    expect(url).not.toContain("b=");
  });
});
