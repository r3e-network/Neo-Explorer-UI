import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/neox/blockscoutClient", () => ({
  fetchBlockscout: vi.fn(),
  LIST_TIMEOUT_MS: 12000,
}));

import { fetchBlockscout } from "@/services/neox/blockscoutClient";
import { accountService } from "../../src/services/neox/accountService";

const NET = "neox-mainnet";

describe("neox accountService.getTopAccounts", () => {
  beforeEach(() => {
    fetchBlockscout.mockReset();
  });

  it("fetches addresses ranked by balance and passes items through raw", async () => {
    const item = {
      hash: "0xholder",
      coin_balance: "123450000000000000000",
      transactions_count: "17",
      is_contract: false,
      is_verified: false,
      name: null,
    };
    fetchBlockscout.mockResolvedValueOnce({
      items: [item],
      next_page_params: { hash: "0xholder", fetched_coin_balance: "1", transactions_count: 17, items_count: 50 },
    });

    const page = await accountService.getTopAccounts({ net: NET });

    expect(fetchBlockscout).toHaveBeenCalledWith(NET, "addresses", expect.objectContaining({ params: {} }));
    expect(page.items).toEqual([item]);
    expect(page.nextPageParams).toEqual({
      hash: "0xholder",
      fetched_coin_balance: "1",
      transactions_count: 17,
      items_count: 50,
    });
  });

  it("forwards the cursor as query params", async () => {
    fetchBlockscout.mockResolvedValueOnce({ items: [], next_page_params: null });

    await accountService.getTopAccounts({ net: NET, cursor: { hash: "0xprev", items_count: 50 } });

    expect(fetchBlockscout).toHaveBeenCalledWith(
      NET,
      "addresses",
      expect.objectContaining({ params: { hash: "0xprev", items_count: 50 } })
    );
  });

  it("normalizes a null/404 body to an empty page", async () => {
    fetchBlockscout.mockResolvedValueOnce(null);
    expect(await accountService.getTopAccounts({ net: NET })).toEqual({ items: [], nextPageParams: null });
  });
});

describe("neox accountService.getLogs", () => {
  beforeEach(() => {
    fetchBlockscout.mockReset();
  });

  it("fetches address logs with the address encoded in the path", async () => {
    const item = {
      index: 3,
      address: { hash: "0xemitter" },
      topics: ["0xtopic0"],
      data: "0x",
      decoded: null,
      block_number: 7146105,
      block_timestamp: "2026-07-19T06:50:42.000000Z",
      transaction_hash: "0xtx",
    };
    fetchBlockscout.mockResolvedValueOnce({ items: [item], next_page_params: { index: 3 } });

    const page = await accountService.getLogs("0xEmitter", { net: NET, cursor: { index: 9 } });

    expect(fetchBlockscout).toHaveBeenCalledWith(
      NET,
      "addresses/0xEmitter/logs",
      expect.objectContaining({ params: { index: 9 } })
    );
    expect(page.items).toEqual([item]);
    expect(page.nextPageParams).toEqual({ index: 3 });
  });

  it("normalizes a null/404 body to an empty page", async () => {
    fetchBlockscout.mockResolvedValueOnce(null);
    expect(await accountService.getLogs("0xabc", { net: NET })).toEqual({ items: [], nextPageParams: null });
  });
});
