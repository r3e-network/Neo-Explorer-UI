import { GAS_HASH, NEO_HASH } from "@/constants";
import { KNOWN_CONTRACTS } from "@/constants/knownContracts";
import { optimizeLogoUrl } from "@/utils/logoOptimization";

const localImages = import.meta.glob("@/assets/gui/*.png", { eager: true, import: "default" });

const NATIVE_TOKEN_LOGOS = {
  [NEO_HASH]: "https://s2.coinmarketcap.com/static/img/coins/64x64/1376.png",
  [GAS_HASH]: "https://s2.coinmarketcap.com/static/img/coins/64x64/1785.png",
};

function normalizeHash(hash) {
  const normalized = String(hash || "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.startsWith("0x") ? normalized : `0x${normalized}`;
}

function defaultIcon(type) {
  const fallbackPath = type === "NEP11" ? "/src/assets/gui/defaultNep11.png" : "/src/assets/gui/defaultNep17.png";
  return localImages[fallbackPath] || "";
}

export function getTokenIcon(hash, type = "NEP17") {
  const normalizedHash = normalizeHash(hash);
  if (!normalizedHash) return defaultIcon(type);

  const nativeLogo = NATIVE_TOKEN_LOGOS[normalizedHash];
  if (nativeLogo) {
    return optimizeLogoUrl(nativeLogo, { kind: "token" });
  }

  const localPath = `/src/assets/gui/${normalizedHash}.png`;
  if (localImages[localPath]) {
    return localImages[localPath];
  }

  const knownLogo = KNOWN_CONTRACTS[normalizedHash]?.logo;
  if (knownLogo) {
    return optimizeLogoUrl(knownLogo, { kind: "token" });
  }

  return defaultIcon(type);
}

export function hasTokenIcon(hash) {
  const normalizedHash = normalizeHash(hash);
  if (!normalizedHash) return false;

  if (NATIVE_TOKEN_LOGOS[normalizedHash]) {
    return true;
  }

  const localPath = `/src/assets/gui/${normalizedHash}.png`;
  if (localImages[localPath]) {
    return true;
  }

  return !!KNOWN_CONTRACTS[normalizedHash]?.logo;
}
