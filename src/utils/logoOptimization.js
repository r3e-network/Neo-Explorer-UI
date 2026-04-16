import { getKnownAddressLogo } from "@/constants/knownAddresses";
import { publicKeyToAddress } from "@/utils/neoHelpers";

const LOGO_PROXY_PATH = "/api/logo";
const DEFAULT_QUALITY = 72;

const SIZE_BY_KIND = {
  validator: 64,
  candidate: 72,
  contract: 72,
  user: 64,
  token: 64,
  default: 72,
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

const clampInteger = (value, min, max, fallback) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
};

const shouldProxyByDefault = () => {
  if (typeof import.meta === "undefined" || !import.meta.env) {
    return false;
  }

  if (import.meta.env.VITE_ENABLE_LOGO_PROXY === "true") {
    return true;
  }

  return Boolean(import.meta.env.PROD);
};

export function optimizeLogoUrl(rawUrl, options = {}) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";

  if (url.startsWith(`${LOGO_PROXY_PATH}?`)) {
    return url;
  }

  if (!isHttpUrl(url)) {
    return url;
  }

  const shouldProxy =
    typeof options.forceProxy === "boolean" ? options.forceProxy : shouldProxyByDefault();

  if (!shouldProxy) {
    return url;
  }

  const kind = String(options.kind || "default").toLowerCase();
  const defaultSize = SIZE_BY_KIND[kind] || SIZE_BY_KIND.default;
  const width = clampInteger(options.width, 24, 512, defaultSize);
  const quality = clampInteger(options.quality, 40, 90, DEFAULT_QUALITY);
  const fit = options.fit === "cover" ? "cover" : "contain";

  const params = new URLSearchParams({
    u: url,
    w: String(width),
    q: String(quality),
    fit,
  });

  return `${LOGO_PROXY_PATH}?${params.toString()}`;
}

const NEOFS_GATEWAYS = [
  "https://filesend.ngd.network/gate/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc",
  "https://http.fs.neo.org/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc",
];

export function resolveCandidateLogoUrl(logoValue) {
  const normalized = String(logoValue || "").trim();
  if (!normalized) return "";

  if (normalized.startsWith("/api/logo?")) {
    return normalized;
  }

  if (isHttpUrl(normalized)) {
    return optimizeLogoUrl(normalized, { kind: "candidate" });
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return optimizeLogoUrl(`${NEOFS_GATEWAYS[0]}/${normalized}`, { kind: "candidate" });
}

export function resolveCandidateLogoUrlFallbacks(logoValue) {
  const normalized = String(logoValue || "").trim();
  if (!normalized) return [];

  if (normalized.startsWith("/api/logo?") || isHttpUrl(normalized) || normalized.startsWith("/")) {
    return [resolveCandidateLogoUrl(normalized)].filter(Boolean);
  }

  return NEOFS_GATEWAYS
    .map((gw) => optimizeLogoUrl(`${gw}/${normalized}`, { kind: "candidate" }))
    .filter(Boolean);
}

export function getDefaultCandidateLogoUrl(publicKey) {
  const normalized = String(publicKey || "").trim();
  if (!normalized) return "";

  const derivedAddress = publicKeyToAddress(normalized);
  return getKnownAddressLogo(derivedAddress) || "";
}
