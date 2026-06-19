import { explorerQueryClient } from "@/query/client";
import { resolveNetworkName } from "@/utils/env";

const DEFAULT_STALE_TIME_MS = 3_000;
const freshnessSnapshots = new Map();

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

function keySignature(queryKey) {
  return JSON.stringify(Array.isArray(queryKey) ? queryKey : [queryKey]);
}

function extractFreshnessHeight(data) {
  const candidates = [
    data?.summary?.last_indexed_block,
    data?.summary?.lastIndexedBlock,
    data?.summary?.total_block_count,
    data?.last_indexed_block,
    data?.lastIndexedBlock,
    data?.total_block_count,
    data?.paging?.blocks_total,
    data?.paging?.total,
    data?.latest_blocks?.[0]?.index,
    data?.latest_blocks?.[0]?.height,
    data?.data?.[0]?.index,
    data?.data?.[0]?.height,
    data?.result?.[0]?.index,
    data?.result?.[0]?.height,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

export function createExplorerQueryKey(scope, params = {}) {
  return ["neo-explorer", normalizeNetwork(params.network), scope, stableParams(params)];
}

export function clearFreshnessSnapshots() {
  freshnessSnapshots.clear();
}

export function getFreshnessSnapshot(queryKey) {
  return freshnessSnapshots.get(keySignature(queryKey)) || null;
}

export async function fetchFreshQuery({
  client = explorerQueryClient,
  forceRefresh = false,
  queryFn,
  queryKey,
  source = "",
  staleTime = DEFAULT_STALE_TIME_MS,
} = {}) {
  if (!queryFn || !queryKey) {
    throw new Error("fetchFreshQuery requires queryKey and queryFn");
  }

  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];
  const network = String(normalizedKey[1] || normalizeNetwork()).toLowerCase();
  let fetchedFromOrigin = false;

  if (forceRefresh) {
    await client.invalidateQueries({ exact: true, queryKey: normalizedKey });
  }

  const startedAt = Date.now();
  const data = await client.fetchQuery({
    queryKey: normalizedKey,
    queryFn: async () => {
      fetchedFromOrigin = true;
      return queryFn({ forceRefresh });
    },
    staleTime: forceRefresh ? 0 : staleTime,
  });
  const observedAt = Date.now();
  const state = client.getQueryState(normalizedKey);
  const fetchedAt = Number(state?.dataUpdatedAt || observedAt);

  freshnessSnapshots.set(keySignature(normalizedKey), {
    ageMs: Math.max(0, observedAt - fetchedAt),
    fetchedAt,
    forceRefresh,
    height: extractFreshnessHeight(data),
    network,
    observedAt,
    source: fetchedFromOrigin ? source : "query-cache",
    durationMs: Math.max(0, observedAt - startedAt),
  });

  return data;
}
