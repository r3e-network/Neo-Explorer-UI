import { beforeEach, describe, expect, it, vi } from "vitest";

describe("usePriceCache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("fetches prices from the same-origin price endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        neo: { usd: 2.7, usd_24h_change: 3.5 },
        gas: { usd: 1.5, usd_24h_change: 1.2 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { usePriceCache } = await import("@/composables/usePriceCache");
    const { fetchPrices } = usePriceCache();
    const result = await fetchPrices(true);

    expect(fetchMock).toHaveBeenCalledWith("/api/prices", expect.any(Object));
    expect(result).toMatchObject({
      neo: 2.7,
      gas: 1.5,
      neoChange: 3.5,
      gasChange: 1.2,
    });
  });
});
