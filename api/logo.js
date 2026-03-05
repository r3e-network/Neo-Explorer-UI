const net = require("node:net");
const dns = require("node:dns").promises;
const sharp = require("sharp");

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const FALLBACK_LOGO_REDIRECT = "/favicon.ico";

const clampInteger = (value, min, max, fallback) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
};

const isLoopbackHost = (hostname) => {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized === "localhost" || normalized.endsWith(".localhost");
};

const isPrivateIpv4 = (ip) => {
  const parts = String(ip || "")
    .split(".")
    .map((part) => Number.parseInt(part, 10));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
};

const isPrivateIpv6 = (ip) => {
  const normalized = String(ip || "").toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
};

const isPrivateIp = (ip) => {
  if (!net.isIP(ip)) return false;
  if (net.isIP(ip) === 4) return isPrivateIpv4(ip);
  return isPrivateIpv6(ip);
};

const isDisallowedHostname = async (hostname) => {
  if (isLoopbackHost(hostname)) return true;

  if (net.isIP(hostname)) {
    return isPrivateIp(hostname);
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    return records.some((record) => isPrivateIp(record.address));
  } catch {
    // If DNS lookup fails, let fetch handle the error.
    return false;
  }
};

module.exports = async function handler(req, res) {
  const respondWithFallbackLogo = () => {
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    );
    return res.redirect(302, FALLBACK_LOGO_REDIRECT);
  };

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const source = String(req.query?.u || "").trim();
  if (!source) {
    return res.status(400).json({ error: "Missing query param: u" });
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(source);
  } catch {
    return res.status(400).json({ error: "Invalid source URL" });
  }

  if (!["http:", "https:"].includes(sourceUrl.protocol)) {
    return res.status(400).json({ error: "Only http/https URLs are supported" });
  }

  if (await isDisallowedHostname(sourceUrl.hostname)) {
    return res.status(400).json({ error: "Blocked host" });
  }

  const width = clampInteger(req.query?.w, 24, 512, 72);
  const quality = clampInteger(req.query?.q, 40, 90, 72);
  const fit = String(req.query?.fit || "contain").toLowerCase() === "cover" ? "cover" : "contain";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstream;
  try {
    upstream = await fetch(sourceUrl.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "neo-explorer-logo-proxy/1.0",
      },
    });
  } catch {
    clearTimeout(timeout);
    return respondWithFallbackLogo();
  }
  clearTimeout(timeout);

  if (!upstream.ok) {
    return respondWithFallbackLogo();
  }

  const contentLength = Number.parseInt(upstream.headers.get("content-length") || "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    return res.status(413).json({ error: "Source image too large" });
  }

  const contentType = String(upstream.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.startsWith("image/")) {
    return respondWithFallbackLogo();
  }

  let sourceBuffer;
  try {
    const data = await upstream.arrayBuffer();
    sourceBuffer = Buffer.from(data);
  } catch {
    return respondWithFallbackLogo();
  }

  if (!sourceBuffer.length) {
    return respondWithFallbackLogo();
  }

  if (sourceBuffer.length > MAX_SOURCE_BYTES) {
    return res.status(413).json({ error: "Source image too large" });
  }

  try {
    const optimized = await sharp(sourceBuffer, { failOnError: false })
      .rotate()
      .resize({
        width,
        height: width,
        fit,
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .webp({ quality, effort: 4 })
      .toBuffer();

    res.setHeader("Content-Type", "image/webp");
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=604800, stale-while-revalidate=2592000"
    );
    return res.status(200).send(optimized);
  } catch {
    // If conversion fails (unsupported format), redirect to original source.
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    );
    return res.redirect(302, sourceUrl.toString());
  }
};
