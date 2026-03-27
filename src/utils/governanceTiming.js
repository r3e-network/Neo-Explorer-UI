const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;

export const DEFAULT_GOVERNANCE_VALIDITY_DAYS = 30;
export const DEFAULT_GOVERNANCE_VALID_UNTIL_BLOCK_INCREMENT = 1000;

function toPositiveInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.floor(numeric);
}

export function resolveGovernanceValidUntilBlock({
  currentHeight,
  msPerBlock,
  maxValidUntilBlockIncrement,
  targetDays = DEFAULT_GOVERNANCE_VALIDITY_DAYS,
  fallbackIncrement = DEFAULT_GOVERNANCE_VALID_UNTIL_BLOCK_INCREMENT,
}) {
  const normalizedHeight = toPositiveInteger(currentHeight) ?? 0;
  const normalizedMsPerBlock = toPositiveInteger(msPerBlock);
  const normalizedTargetDays = toPositiveInteger(targetDays) ?? DEFAULT_GOVERNANCE_VALIDITY_DAYS;
  const normalizedMaxIncrement = toPositiveInteger(maxValidUntilBlockIncrement);
  const normalizedFallbackIncrement =
    toPositiveInteger(fallbackIncrement) ?? DEFAULT_GOVERNANCE_VALID_UNTIL_BLOCK_INCREMENT;

  const requestedIncrement = normalizedMsPerBlock
    ? Math.ceil((normalizedTargetDays * DAY_IN_MS) / normalizedMsPerBlock)
    : null;

  let increment = requestedIncrement ?? normalizedMaxIncrement ?? normalizedFallbackIncrement;
  if (normalizedMaxIncrement) {
    increment = Math.min(increment, normalizedMaxIncrement);
  }

  return normalizedHeight + increment;
}

function formatDuration(durationMs) {
  if (durationMs < MINUTE_IN_MS) {
    return "under 1m";
  }

  const roundedMinutes = Math.ceil(durationMs / MINUTE_IN_MS);
  const days = Math.floor(roundedMinutes / (24 * 60));
  const hours = Math.floor((roundedMinutes % (24 * 60)) / 60);
  const minutes = roundedMinutes % 60;
  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.slice(0, 2).join(" ");
}

export function describeGovernanceTxExpiry({ validUntilBlock, currentBlockHeight, msPerBlock }) {
  const normalizedValidUntilBlock = toPositiveInteger(validUntilBlock);
  const normalizedCurrentBlockHeight = toPositiveInteger(currentBlockHeight);
  const normalizedMsPerBlock = toPositiveInteger(msPerBlock);

  if (!normalizedValidUntilBlock || normalizedCurrentBlockHeight === null || !normalizedMsPerBlock) {
    return "";
  }

  const deltaBlocks = normalizedValidUntilBlock - normalizedCurrentBlockHeight;
  const deltaMs = Math.abs(deltaBlocks) * normalizedMsPerBlock;
  const duration = formatDuration(deltaMs);

  if (deltaBlocks < 0) {
    return `Expired ${duration} ago`;
  }

  return `Expires in ${duration}`;
}
