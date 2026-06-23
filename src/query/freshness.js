import { explorerQueryClient } from "@/query/client";
import { resolveNetworkName } from "@/utils/env";

const DEFAULT_STALE_TIME_MS = 3_000;

function stableParams(params = {}) {
  const entries = Object.entries(params)
    .filter(([key, value]) => key !== "network" && value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right));

  return entries.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

function normalizeNetwork(network) {
  return String(network || resolveNetworkName() || "mainnet")
    .trim()
    .toLowerCase();
}

export function createExplorerQueryKey(scope, params = {}) {
  return ["neo-explorer", normalizeNetwork(params.network), scope, stableParams(params)];
}

export async function fetchFreshQuery({
  client = explorerQueryClient,
  forceRefresh = false,
  queryFn,
  queryKey,
  staleTime = DEFAULT_STALE_TIME_MS,
} = {}) {
  if (!queryFn || !queryKey) {
    throw new Error("fetchFreshQuery requires queryKey and queryFn");
  }

  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  if (forceRefresh) {
    await client.invalidateQueries({ exact: true, queryKey: normalizedKey });
  }

  return client.fetchQuery({
    queryKey: normalizedKey,
    queryFn: () => queryFn({ forceRefresh }),
    staleTime: forceRefresh ? 0 : staleTime,
  });
}
