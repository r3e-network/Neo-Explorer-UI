import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/neox/blockscoutClient", () => ({
  fetchBlockscout: vi.fn(),
  LIST_TIMEOUT_MS: 12000,
}));

import { fetchBlockscout } from "@/services/neox/blockscoutClient";
import { contractService } from "../../src/services/neox/contractService";

const NET = "neox-mainnet";

describe("neox contractService.getList", () => {
  beforeEach(() => {
    fetchBlockscout.mockReset();
  });

  it("fetches smart-contracts and passes items through raw", async () => {
    const item = {
      address: { hash: "0xabc", name: "Router" },
      compiler_version: "v0.8.24+commit.e11b9ed9",
      language: "solidity",
      license_type: "mit",
      optimization_enabled: true,
      verified_at: "2026-07-01T00:00:00.000000Z",
      transactions_count: 42,
      coin_balance: "1000000000000000000",
      certified: true,
    };
    fetchBlockscout.mockResolvedValueOnce({
      items: [item],
      next_page_params: { items_count: 50, smart_contract_id: 7 },
    });

    const page = await contractService.getList({ net: NET });

    expect(fetchBlockscout).toHaveBeenCalledWith(NET, "smart-contracts", expect.objectContaining({ params: {} }));
    expect(page.items).toEqual([item]);
    expect(page.nextPageParams).toEqual({ items_count: 50, smart_contract_id: 7 });
  });

  it("forwards the cursor and the q search filter as query params", async () => {
    fetchBlockscout.mockResolvedValueOnce({ items: [], next_page_params: null });

    await contractService.getList({ net: NET, q: "Uniswap", cursor: { items_count: 50, smart_contract_id: 7 } });

    expect(fetchBlockscout).toHaveBeenCalledWith(
      NET,
      "smart-contracts",
      expect.objectContaining({ params: { items_count: 50, smart_contract_id: 7, q: "Uniswap" } })
    );
  });

  it("normalizes a null/404 body to an empty page", async () => {
    fetchBlockscout.mockResolvedValueOnce(null);
    const page = await contractService.getList({ net: NET });
    expect(page).toEqual({ items: [], nextPageParams: null });
  });
});

describe("neox contractService.getCounters", () => {
  beforeEach(() => {
    fetchBlockscout.mockReset();
  });

  it("returns the raw counters payload", async () => {
    const counters = {
      smart_contracts: "2231",
      verified_smart_contracts: "81",
      new_verified_smart_contracts_24h: "1",
    };
    fetchBlockscout.mockResolvedValueOnce(counters);

    const result = await contractService.getCounters({ net: NET });

    expect(fetchBlockscout).toHaveBeenCalledWith(NET, "smart-contracts/counters", expect.any(Object));
    expect(result).toEqual(counters);
  });

  it("returns null on a 404", async () => {
    fetchBlockscout.mockResolvedValueOnce(null);
    expect(await contractService.getCounters({ net: NET })).toBeNull();
  });
});
