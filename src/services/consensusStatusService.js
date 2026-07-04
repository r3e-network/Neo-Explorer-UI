export const CONSENSUS_VALIDATOR_COUNT = 7;
export const DEFAULT_CONSENSUS_SLOT_LIMIT = 36;

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampPercent(value) {
  const number = toFiniteNumber(value);
  if (number === null) return null;
  return Math.max(0, Math.min(100, number));
}

function getBlockHeight(block) {
  return toFiniteNumber(block?.height ?? block?.index ?? block?.block_index ?? block?.blockIndex);
}

function getBlockPrimaryIndex(block) {
  const primary = toFiniteNumber(block?.primaryNode ?? block?.primary_node ?? block?.primary);
  return primary !== null && primary >= 0 ? primary : null;
}

function getLivenessEntry(liveness, nodeIndex) {
  if (!liveness) return null;
  if (typeof liveness.get === "function") return liveness.get(nodeIndex) || liveness.get(String(nodeIndex)) || null;
  return liveness[nodeIndex] || liveness[String(nodeIndex)] || null;
}

function safeResolve(resolver, nodeIndex, fallback = null) {
  if (typeof resolver !== "function") return fallback;
  try {
    return resolver(nodeIndex) || fallback;
  } catch {
    return fallback;
  }
}

function normalizeBlocks(blocks, validatorCount) {
  return (Array.isArray(blocks) ? blocks : [])
    .map((block) => {
      const height = getBlockHeight(block);
      if (height === null || height < 0) return null;
      const actualPrimary = getBlockPrimaryIndex(block);
      return {
        height,
        actualPrimary,
        expectedPrimary: expectedPrimaryIndexForBlock(height, validatorCount),
        interval: toFiniteNumber(block?.interval),
        tx: toFiniteNumber(block?.tx ?? block?.tx_count ?? block?.txCount),
        time: toFiniteNumber(block?.time ?? block?.timestamp ?? block?.time_ms),
        hash: block?.blockHash || block?.hash || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.height - b.height);
}

function createRow(nodeIndex, { resolveName, resolveAddress, resolveLogo }) {
  return {
    nodeIndex,
    name: safeResolve(resolveName, nodeIndex, `Consensus Node ${nodeIndex + 1}`),
    address: safeResolve(resolveAddress, nodeIndex, ""),
    logoUrl: safeResolve(resolveLogo, nodeIndex, ""),
    status: "unknown",
    livenessRatio: null,
    proposed: 0,
    missed: 0,
    recentExpected: 0,
    recentProposed: 0,
    recentMissed: 0,
    recentRecovered: 0,
    recentViewChanges: 0,
    timeline: [],
  };
}

function deriveRecentRatio(row) {
  if (row.recentExpected <= 0) return null;
  return (row.recentProposed / row.recentExpected) * 100;
}

function deriveStatus(row) {
  const hasData =
    row.livenessRatio !== null ||
    row.recentExpected > 0 ||
    row.recentProposed > 0 ||
    row.recentMissed > 0;
  if (!hasData) return "unknown";
  if (row.recentMissed > 0) return "degraded";
  if (row.livenessRatio === null) return "unknown";
  if (row.livenessRatio >= 99) return "healthy";
  if (row.livenessRatio >= 95) return "watch";
  return "degraded";
}

export function expectedPrimaryIndexForBlock(blockHeight, validatorCount = CONSENSUS_VALIDATOR_COUNT) {
  const height = toFiniteNumber(blockHeight);
  const count = toFiniteNumber(validatorCount);
  if (!Number.isInteger(height) || height < 0 || !Number.isInteger(count) || count <= 0) return null;
  return height % count;
}

export function buildConsensusStatusRows({
  blocks = [],
  liveness = {},
  validatorCount = CONSENSUS_VALIDATOR_COUNT,
  slotLimit = DEFAULT_CONSENSUS_SLOT_LIMIT,
  resolveName,
  resolveAddress,
  resolveLogo,
} = {}) {
  const count = Math.max(1, Math.floor(toFiniteNumber(validatorCount) || CONSENSUS_VALIDATOR_COUNT));
  const maxSlots = Math.max(1, Math.floor(toFiniteNumber(slotLimit) || DEFAULT_CONSENSUS_SLOT_LIMIT));
  const rows = Array.from({ length: count }, (_value, nodeIndex) =>
    createRow(nodeIndex, { resolveName, resolveAddress, resolveLogo })
  );
  const normalizedBlocks = normalizeBlocks(blocks, count);

  for (const block of normalizedBlocks) {
    const actual = block.actualPrimary;
    const expected = block.expectedPrimary;
    const actualRow = actual !== null && actual >= 0 && actual < rows.length ? rows[actual] : null;
    const expectedRow = expected !== null && expected >= 0 && expected < rows.length ? rows[expected] : null;

    if (actualRow) {
      actualRow.recentProposed += 1;
      if (expected !== actual) actualRow.recentRecovered += 1;
    }

    if (expectedRow) {
      const state = actual === null ? "unknown" : actual === expected ? "ok" : "view-change";
      expectedRow.recentExpected += 1;
      if (state === "view-change") {
        expectedRow.recentMissed += 1;
        expectedRow.recentViewChanges += 1;
      }
      expectedRow.timeline.push({
        height: block.height,
        hash: block.hash,
        expectedPrimary: expected,
        actualPrimary: actual,
        state,
      });
    }
  }

  for (const row of rows) {
    row.timeline = row.timeline.slice(-maxSlots);
    const live = getLivenessEntry(liveness, row.nodeIndex);
    const liveProposed = toFiniteNumber(live?.proposed);
    const liveMissed = toFiniteNumber(live?.missed);
    row.proposed = liveProposed ?? row.recentProposed;
    row.missed = liveMissed ?? row.recentMissed;
    row.livenessRatio = clampPercent(live?.ratio ?? deriveRecentRatio(row));
    row.status = deriveStatus(row);
  }

  return rows;
}

export function buildConsensusStatusSummary(rows = [], blocks = []) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const ratios = normalizedRows
    .map((row) => row.livenessRatio)
    .filter((ratio) => Number.isFinite(Number(ratio)));
  const normalizedBlocks = normalizeBlocks(blocks, CONSENSUS_VALIDATOR_COUNT);
  const latestBlock = normalizedBlocks[normalizedBlocks.length - 1] || null;
  const viewChanges = normalizedRows.reduce((sum, row) => sum + (Number(row.recentViewChanges) || 0), 0);
  const healthy = normalizedRows.filter((row) => row.status === "healthy").length;
  const degraded = normalizedRows.filter((row) => row.status === "degraded").length;

  return {
    validatorCount: normalizedRows.length,
    healthy,
    degraded,
    viewChanges,
    latestHeight: latestBlock?.height ?? null,
    observedBlocks: normalizedBlocks.length,
    avgLiveness: ratios.length ? ratios.reduce((sum, ratio) => sum + Number(ratio), 0) / ratios.length : null,
    status: degraded > 0 ? "degraded" : healthy === normalizedRows.length && normalizedRows.length > 0 ? "healthy" : "watch",
  };
}
