import { GAS_HASH, NEO_HASH } from "@/constants";
import { getTokenIcon } from "@/utils/getTokenIcon";

const NEO_BADGE_PATTERN = /^(NeoToken|NEO)(?:\b|:)/i;
const GAS_BADGE_PATTERN = /^(GasToken|GAS)(?:\b|:)/i;

function normalizeHash(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("0x")) return raw;
  return /^[0-9a-f]{40}$/.test(raw) ? `0x${raw}` : raw;
}

function normalizeLabel(value) {
  return String(value || "").trim();
}

export function getNativeTokenBadge(contractHash, label) {
  const normalizedHash = normalizeHash(contractHash);
  const normalizedLabel = normalizeLabel(label);

  if (normalizedHash === NEO_HASH || NEO_BADGE_PATTERN.test(normalizedLabel)) {
    return {
      alt: "NEO",
      src: getTokenIcon(NEO_HASH, "NEP17"),
    };
  }

  if (normalizedHash === GAS_HASH || GAS_BADGE_PATTERN.test(normalizedLabel)) {
    return {
      alt: "GAS",
      src: getTokenIcon(GAS_HASH, "NEP17"),
    };
  }

  return null;
}
