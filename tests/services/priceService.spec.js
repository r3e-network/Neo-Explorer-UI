import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mockGet is available when vi.mock factory runs
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      interceptors: {
        response: { use: vi.fn() },
      },
    })),
  },
}));

vi.mock("../../src/services/cache.js", () => ({
  getCacheKey: vi.fn((...args) => args.join(":")),
  cachedRequest: vi.fn((_key, fn, _ttl) => fn()),
}));

import {
  formatPriceChange,
  formatPrice,
  getTokenPrices,
  getTokenChart,
  getTokenMarketData,
} from "../../src/services/priceService.js";

import { cachedRequest } from "../../src/services/cache.js";

describe("priceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cachedRequest.mockImplementation((_key, fn, _ttl) => fn());
  });

  // ── formatPriceChange ─────────────────────────────────────────

  describe("formatPriceChange", () => {
    it("returns '0.00%' for null", () => {
      expect(formatPriceChange(null)).toBe("0.00%");
    });

    it("returns '0.00%' for undefined", () => {
      expect(formatPriceChange(undefined)).toBe("0.00%");
    });

    it("returns '+0.00%' for 0", () => {
      expect(formatPriceChange(0)).toBe("+0.00%");
    });

    it("returns '+5.23%' for positive number", () => {
      expect(formatPriceChange(5.23)).toBe("+5.23%");
    });

    it("returns '-3.45%' for negative number", () => {
      expect(formatPriceChange(-3.45)).toBe("-3.45%");
    });

    it("rounds to two decimal places", () => {
      expect(formatPriceChange(1.999)).toBe("+2.00%");
      expect(formatPriceChange(-0.001)).toBe("-0.00%");
    });
  });

  // ── formatPrice ───────────────────────────────────────────────

  describe("formatPrice", () => {
    it("returns '$0.00' for falsy price (0)", () => {
      expect(formatPrice(0)).toBe("$0.00");
    });

    it("returns '$0.00' for null", () => {
      expect(formatPrice(null)).toBe("$0.00");
    });

    it("returns '$0.00' for undefined", () => {
      expect(formatPrice(undefined)).toBe("$0.00");
    });

    it("formats large prices with two decimals", () => {
      expect(formatPrice(15.5)).toBe("$15.50");
    });

    it("formats small prices with up to six decimals", () => {
      const result = formatPrice(0.001234);
      expect(result).toBe("$0.001234");
    });

    it("formats integer prices correctly", () => {
      expect(formatPrice(100)).toBe("$100.00");
    });

    it("handles currency parameter", () => {
      const result = formatPrice(10, "eur");
      expect(result).toContain("10");
      expect(result).toContain("€");
    });
  });

  // ── getTokenPrices ────────────────────────────────────────────

  describe("getTokenPrices", () => {
    it("returns mapped token prices on success", async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          neo: { usd: 15.5, usd_24h_change: 3.2 },
          "gas-network-token": { usd: 5.1, usd_24h_change: -1.5 },
        },
      });

      const result = await getTokenPrices(["neo", "gas"], "usd");

      expect(result).toEqual({
        neo: { price: 15.5, change24h: 3.2 },
        gas: { price: 5.1, change24h: -1.5 },
      });
    });

    it("uses cachedRequest for caching", async () => {
      mockGet.mockResolvedValueOnce({ data: {} });
      await getTokenPrices();
      expect(cachedRequest).toHaveBeenCalledWith(expect.any(String), expect.any(Function), 60000);
    });

    it("returns fallback prices on API error", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network error"));

      const result = await getTokenPrices();

      expect(result).toEqual({
        neo: { price: 0, change24h: 0 },
        gas: { price: 0, change24h: 0 },
      });
    });

    it("returns cached data when cachedRequest has a hit", async () => {
      const cached = {
        neo: { price: 20, change24h: 1 },
        gas: { price: 8, change24h: -2 },
      };
      cachedRequest.mockResolvedValueOnce(cached);

      const result = await getTokenPrices();
      expect(result).toEqual(cached);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("maps TOKEN_IDS correctly for unknown tokens", async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          "custom-token": { usd: 1.0, usd_24h_change: 0 },
        },
      });

      const result = await getTokenPrices(["custom-token"], "usd");
      expect(result).toEqual({
        "custom-token": { price: 1.0, change24h: 0 },
      });
    });

    it("defaults change24h to 0 when missing", async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          neo: { usd: 10 },
        },
      });

      const result = await getTokenPrices(["neo"], "usd");
      expect(result.neo.change24h).toBe(0);
    });
  });

  // ── getTokenChart ─────────────────────────────────────────────

  describe("getTokenChart", () => {
    it("returns chart data on success", async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          prices: [[1000, 15.5]],
          market_caps: [[1000, 1000000]],
          total_volumes: [[1000, 500000]],
        },
      });

      const result = await getTokenChart("neo");

      expect(result).toEqual({
        prices: [[1000, 15.5]],
        market_caps: [[1000, 1000000]],
        volumes: [[1000, 500000]],
      });
    });

    it("returns empty arrays on API error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));

      const result = await getTokenChart("neo");

      expect(result).toEqual({ prices: [], market_caps: [], volumes: [] });
    });

    it("uses chart TTL for caching", async () => {
      mockGet.mockResolvedValueOnce({
        data: { prices: [], market_caps: [], total_volumes: [] },
      });

      await getTokenChart("neo");

      expect(cachedRequest).toHaveBeenCalledWith(expect.any(String), expect.any(Function), 5 * 60 * 1000);
    });
  });

  // ── getTokenMarketData ────────────────────────────────────────

  describe("getTokenMarketData", () => {
    it("returns first market data item on success", async () => {
      const marketData = { id: "neo", market_cap: 1000000 };
      mockGet.mockResolvedValueOnce({ data: [marketData] });

      const result = await getTokenMarketData("neo");

      expect(result).toEqual(marketData);
    });

    it("returns null for empty response", async () => {
      mockGet.mockResolvedValueOnce({ data: [] });

      const result = await getTokenMarketData("neo");

      expect(result).toBeNull();
    });

    it("returns null on API error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));

      const result = await getTokenMarketData("neo");

      expect(result).toBeNull();
    });
  });
});
