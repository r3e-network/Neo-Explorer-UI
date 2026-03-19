import { getKnownAddressLogo, getKnownAddressName } from "@/constants/knownAddresses";
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

  const neofsGateway = "https://filesend.ngd.network/gate/get/CeeroywT8ppGE4HGjhpzocJkdb2yu3wD5qCGFTjkw1Cc";
  return optimizeLogoUrl(`${neofsGateway}/${normalized}`, { kind: "candidate" });
}

export function getDefaultCandidateLogoUrl(publicKey) {
  const normalized = String(publicKey || "").trim();
  if (!normalized) return "";

  const derivedAddress = publicKeyToAddress(normalized);
  const knownLogo = getKnownAddressLogo(derivedAddress);
  if (knownLogo) {
    return knownLogo;
  }

  const label = getKnownAddressName(derivedAddress) || normalized;
  const initials = getCandidateBadgeInitials(label);
  const palette = getCandidateBadgePalette(normalized);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
      <rect width="96" height="96" rx="48" fill="${palette.background}"/>
      <rect x="4" y="4" width="88" height="88" rx="44" stroke="${palette.ring}" stroke-width="2"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="30" font-weight="800" fill="${palette.foreground}" letter-spacing="1.5">
        ${initials}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function getCandidateBadgeInitials(label = "") {
  const words = String(label || "")
    .replace(/\([^)]*\)/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !["the", "and", "of"].includes(part.toLowerCase()));

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return String(label || "N3").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "N3";
}

function getCandidateBadgePalette(seed = "") {
  const palettes = [
    { background: "#173B35", foreground: "#E9FFF7", ring: "#34D399" },
    { background: "#1C344F", foreground: "#EEF6FF", ring: "#60A5FA" },
    { background: "#4A2B1F", foreground: "#FFF3E8", ring: "#F59E0B" },
    { background: "#3A244D", foreground: "#F7EEFF", ring: "#C084FC" },
    { background: "#1D3A4A", foreground: "#E6FBFF", ring: "#22D3EE" },
  ];

  const normalized = String(seed || "");
  let index = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    index = (index + normalized.charCodeAt(i)) % palettes.length;
  }
  return palettes[index];
}
