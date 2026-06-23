import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it, vi } from "vitest";

import { createExplorerQueryKey, fetchFreshQuery } from "@/query/freshness";

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

  it("uses the TanStack Query cache for warm reads and refetches on forceRefresh", async () => {
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

    await fetchFreshQuery({ client, queryKey, queryFn, staleTime: 60_000 });
    const warm = await fetchFreshQuery({ client, queryKey, queryFn, staleTime: 60_000 });

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(warm.summary.last_indexed_block).toBe(100);

    const refreshed = await fetchFreshQuery({ client, queryKey, queryFn, staleTime: 60_000, forceRefresh: true });

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(queryFn.mock.calls[1][0]).toMatchObject({ forceRefresh: true });
    expect(refreshed.summary.last_indexed_block).toBe(101);
  });
});
