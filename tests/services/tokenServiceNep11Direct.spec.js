import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// #24fe: NEP-11 token detail must resolve via the direct /tokens/{hash}
// endpoint first (GetTokenOverview now answers 200 for NEP-11), keeping the
// 200-row catalog scan (tokens?standard=NEP11&limit=200) ONLY as a legacy
// fallback for older backends that 404 the direct call.
//
// This suite exercises the REAL indexerReadService (only global fetch is
// stubbed) so we observe the actual endpoint order, not a mocked boundary.

const safeRpcMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/services/api.js", () => ({
  rpc: vi.fn(),
  safeRpc: safeRpcMock,
  safeRpcList: vi.fn(),
  formatListResponse: vi.fn((r) => r),
}));

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

const NEP11_HASH = "0xabcabcabcabcabcabcabcabcabcabcabcabcabca";

describe("tokenService.getByHashWithFallback NEP-11 direct-first (#24fe)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves a NEP-11 token via the direct /tokens/{hash} endpoint without scanning the 200-row catalog", async () => {
    const directRow = {
      contract_hash: NEP11_HASH,
      display_name: "Cool NFT",
      symbol: "COOL",
      holder_count: 12,
      total_supply_raw: "500",
      decimals: 0,
      standard: "NEP11",
    };
    const fetchMock = vi.fn(async (url) => {
      const path = String(url);
      // Direct single-token endpoint answers 200.
      if (/\/tokens\/[^?]+(\?|$)/.test(path) && !path.includes("standard=NEP11")) {
        return jsonResponse({ data: directRow });
      }
      // Catalog scan must NOT be reached.
      if (path.includes("tokens?standard=NEP11")) {
        return jsonResponse({ data: [] });
      }
      return jsonResponse(null, { ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { tokenService } = await import("../../src/services/tokenService.js");
    // useTokenDetail passes the known standard hint for NFT detail views.
    const result = await tokenService.getByHashWithFallback(NEP11_HASH, { standard: "NEP11" });

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    // Direct endpoint was hit...
    expect(requestedUrls.some((u) => u.includes(`/tokens/${NEP11_HASH}`))).toBe(true);
    // ...and the 200-row catalog scan was NOT.
    expect(requestedUrls.some((u) => u.includes("tokens?standard=NEP11&limit=200"))).toBe(false);
    // Never falls through to the on-chain contractstate probe.
    expect(safeRpcMock).not.toHaveBeenCalled();

    expect(result).toMatchObject({
      hash: NEP11_HASH,
      tokenname: "Cool NFT",
      symbol: "COOL",
      standard: "NEP11",
      totalsupply: "500",
    });
  });

  it("falls back to the 200-row catalog scan when the direct /tokens/{hash} call 404s (older backend)", async () => {
    const catalogRow = {
      contract_hash: NEP11_HASH,
      display_name: "Legacy NFT",
      symbol: "LEG",
      holder_count: 3,
      total_supply_raw: "9",
      decimals: 0,
      standard: "NEP11",
    };
    let catalogScanned = false;
    const fetchMock = vi.fn(async (url) => {
      const path = String(url);
      if (path.includes("tokens?standard=NEP11")) {
        catalogScanned = true;
        return jsonResponse({ data: [catalogRow] });
      }
      // Direct single-token endpoint 404s on the older backend.
      if (/\/tokens\/[^?]+(\?|$)/.test(path)) {
        return jsonResponse(null, { ok: false, status: 404 });
      }
      return jsonResponse(null, { ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { tokenService } = await import("../../src/services/tokenService.js");
    const result = await tokenService.getByHashWithFallback(NEP11_HASH, { standard: "NEP11" });

    expect(catalogScanned).toBe(true);
    expect(safeRpcMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      hash: NEP11_HASH,
      tokenname: "Legacy NFT",
      symbol: "LEG",
      standard: "NEP11",
    });
  });
});
