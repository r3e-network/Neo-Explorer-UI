import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/neox/blockscoutClient", () => ({
  fetchBlockscout: vi.fn(),
  LIST_TIMEOUT_MS: 12000,
}));

import { SourceUnavailableError } from "@/adapters/source";
import { statsService } from "../../src/services/neox/statsService";

const NET = "neox-mainnet";

const jsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

describe("neox statsService.getChartLine", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  it("fetches the line through the /neox-stats proxy with DAY resolution", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ chart: [] }));

    await statsService.getChartLine("newTxns", { net: NET });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/neox-stats/mainnet/lines/newTxns?resolution=DAY",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });

  it("resolves the testnet proxy prefix from the net id", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ chart: [] }));

    await statsService.getChartLine("gasUsedGrowth", { net: "neox-testnet" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/neox-stats/testnet/lines/gasUsedGrowth?resolution=DAY",
      expect.anything()
    );
  });

  it("normalizes string values to numbers, ascending by date, dropping bad rows", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      jsonResponse({
        chart: [
          { date: "2026-07-02", date_to: "2026-07-02", value: "5" },
          { date: "2026-07-01", date_to: "2026-07-01", value: "3.5" },
          { date: "2026-07-03", date_to: "2026-07-03", value: null },
          { date: "2026-07-04", date_to: "2026-07-04", value: "not-a-number" },
          { date: "", value: "9" },
          null,
        ],
      })
    );

    const points = await statsService.getChartLine("newTxns", { net: NET });

    expect(points).toEqual([
      { date: "2026-07-01", value: 3.5 },
      { date: "2026-07-02", value: 5 },
    ]);
  });

  it.each(["txnsSuccessRate", "networkUtilization"])(
    "converts the %s upstream ratio to a percentage",
    async (lineId) => {
      globalThis.fetch.mockResolvedValueOnce(
        jsonResponse({ chart: [{ date: "2026-07-19", value: "0.972844" }] })
      );

      expect(await statsService.getChartLine(lineId, { net: NET })).toEqual([
        { date: "2026-07-19", value: 97.2844 },
      ]);
    }
  );

  it("forwards from/to range params when provided", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ chart: [] }));

    await statsService.getChartLine("newTxns", { net: NET, from: "2026-01-01", to: "2026-02-01" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/neox-stats/mainnet/lines/newTxns?resolution=DAY&from=2026-01-01&to=2026-02-01",
      expect.anything()
    );
  });

  it("resolves an unknown chart id (404) to an empty array", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ error: "not found" }, 404));

    expect(await statsService.getChartLine("nope", { net: NET })).toEqual([]);
  });

  it("throws SourceUnavailableError on a 5xx response", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ error: "boom" }, 502));

    await expect(statsService.getChartLine("newTxns", { net: NET })).rejects.toBeInstanceOf(
      SourceUnavailableError
    );
  });
});

describe("neox statsService.getChartsCatalog", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  it("passes the sections list through", async () => {
    const sections = [
      { id: "transactions", title: "Transactions", charts: [{ id: "newTxns", title: "New transactions" }] },
    ];
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ sections }));

    expect(await statsService.getChartsCatalog({ net: NET })).toEqual(sections);
    expect(globalThis.fetch).toHaveBeenCalledWith("/neox-stats/mainnet/lines", expect.anything());
  });

  it("normalizes a missing body to an empty list", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({}, 404));
    expect(await statsService.getChartsCatalog({ net: NET })).toEqual([]);
  });
});

describe("neox statsService.getCountersList", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  it("passes the counters list through", async () => {
    const counters = [
      { id: "totalTxns", value: "1234567", title: "Total transactions", units: null, description: "All txns" },
    ];
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ counters }));

    expect(await statsService.getCountersList({ net: NET })).toEqual(counters);
    expect(globalThis.fetch).toHaveBeenCalledWith("/neox-stats/mainnet/counters", expect.anything());
  });

  it("normalizes a malformed body to an empty list", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ counters: "nope" }));
    expect(await statsService.getCountersList({ net: NET })).toEqual([]);
  });
});
