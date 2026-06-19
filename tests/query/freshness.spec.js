import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it, vi } from "vitest";

import {
  clearFreshnessSnapshots,
  createExplorerQueryKey,
  fetchFreshQuery,
  getFreshnessSnapshot,
} from "@/query/freshness";

describe("frontend freshness query layer", () => {
  it("keeps stable query keys by network, scope, and sorted params", () => {
    expect(createExplorerQueryKey("blocks.list", { skip: 0, limit: 10, network: "mainnet" })).toEqual([
      "neo-explorer",
      "mainnet",
      "blocks.list",
      { limit: 10, skip: 0 },
    ]);

    expect(createExplorerQueryKey("blocks.list", { limit: 10, network: "mainnet", skip: 0 })).toEqual(
      createExplorerQueryKey("blocks.list", { skip: 0, network: "mainnet", limit: 10 }),
    );
  });

  it("uses TanStack Query cache for warm reads and records forced freshness refreshes", async () => {
    clearFreshnessSnapshots();
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          retry: false,
        },
      },
    });
    const queryKey = createExplorerQueryKey("home.aggregate", { network: "mainnet", limit: 6 });
    const queryFn = vi.fn(async ({ forceRefresh }) => ({
      summary: {
        last_indexed_block: forceRefresh ? 101 : 100,
        freshness_seconds: 0,
      },
      latest_blocks: [{ index: forceRefresh ? 100 : 99, hash: "0xblock" }],
    }));

    await fetchFreshQuery({
      client,
      queryKey,
      queryFn,
      source: "home",
      staleTime: 60_000,
    });
    await fetchFreshQuery({
      client,
      queryKey,
      queryFn,
      source: "home",
      staleTime: 60_000,
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    await fetchFreshQuery({
      client,
      queryKey,
      queryFn,
      source: "home",
      staleTime: 60_000,
      forceRefresh: true,
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(queryFn.mock.calls[1][0]).toMatchObject({ forceRefresh: true });
    expect(getFreshnessSnapshot(queryKey)).toMatchObject({
      forceRefresh: true,
      height: 101,
      network: "mainnet",
      source: "home",
    });
  });
});
