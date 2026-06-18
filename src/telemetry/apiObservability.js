const MAX_API_OBSERVATIONS = 30;
const WINDOW_OBSERVATIONS_KEY = "__NEO3FURA_API_OBSERVATIONS__";

const OBSERVABILITY_HEADERS = Object.freeze({
  requestId: "x-request-id",
  traceparent: "traceparent",
  edgeCache: "x-edge-cache",
  explorerCacheStrategy: "x-explorer-cache-strategy",
  neo3furaCache: "x-neo3fura-cache",
  proxyTarget: "x-proxy-target",
  upstreamSource: "x-upstream-source",
  serverTiming: "server-timing",
  timingAllowOrigin: "timing-allow-origin",
});

const observations = [];

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")
  );
}

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) return value.map(String).join(", ").trim();
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function readHeader(headers, name) {
  if (!headers || !name) return "";

  if (typeof headers.get === "function") {
    return normalizeHeaderValue(headers.get(name));
  }

  const lowerName = name.toLowerCase();
  const directValue = headers[name] ?? headers[lowerName] ?? headers[name.toUpperCase()];
  if (directValue !== undefined) return normalizeHeaderValue(directValue);

  const matchedEntry = Object.entries(headers).find(([key]) => String(key).toLowerCase() === lowerName);
  if (matchedEntry) return normalizeHeaderValue(matchedEntry[1]);

  if (typeof headers.toJSON === "function") {
    const jsonHeaders = headers.toJSON();
    return normalizeHeaderValue(jsonHeaders?.[name] ?? jsonHeaders?.[lowerName]);
  }

  return "";
}

function redactSearchParams(url) {
  const sensitivePattern = /(auth|jwt|key|password|secret|signature|token)/i;
  for (const key of Array.from(url.searchParams.keys())) {
    if (sensitivePattern.test(key)) {
      url.searchParams.set(key, "redacted");
    }
  }
}

function normalizeUrl(value) {
  const rawUrl = typeof value === "string" ? value : value?.url || value?.href || "";
  if (!rawUrl) return "";

  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://neo.local";
    const parsed = new URL(rawUrl, base);
    redactSearchParams(parsed);
    if (rawUrl.startsWith("/") || parsed.origin === base) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    return String(rawUrl).slice(0, 300);
  }
}

function parseServerTiming(serverTiming) {
  const value = String(serverTiming || "").trim();
  if (!value) return [];

  return value
    .split(",")
    .map((entry) => {
      const [namePart, ...params] = entry.split(";").map((part) => part.trim()).filter(Boolean);
      const metric = { name: namePart };
      for (const param of params) {
        const [key, rawValue = ""] = param.split("=");
        const normalizedKey = String(key || "").trim().toLowerCase();
        const normalizedValue = rawValue.replace(/^"|"$/g, "").trim();
        if (normalizedKey === "dur") {
          const durationMs = Number(normalizedValue);
          if (Number.isFinite(durationMs)) metric.durationMs = durationMs;
        } else if (normalizedKey === "desc" && normalizedValue) {
          metric.description = normalizedValue;
        }
      }
      return compactObject(metric);
    })
    .filter((metric) => metric.name);
}

function hasObservationHeader(values) {
  return Object.values(values).some((value) => normalizeHeaderValue(value));
}

function publishObservations() {
  if (typeof window === "undefined") return;
  window[WINDOW_OBSERVATIONS_KEY] = getRecentApiObservations();
}

export function extractApiObservationFromHeaders(headers, options = {}) {
  const headerValues = Object.fromEntries(
    Object.entries(OBSERVABILITY_HEADERS).map(([field, header]) => [field, readHeader(headers, header)])
  );

  if (!hasObservationHeader(headerValues)) return null;

  return compactObject({
    timestamp: new Date().toISOString(),
    source: normalizeHeaderValue(options.source),
    method: normalizeHeaderValue(options.method).toUpperCase(),
    url: normalizeUrl(options.url),
    status: Number.isFinite(Number(options.status)) ? Number(options.status) : undefined,
    ok: typeof options.ok === "boolean" ? options.ok : undefined,
    ...headerValues,
    serverTimingMetrics: parseServerTiming(headerValues.serverTiming),
  });
}

export function recordApiObservation(observation) {
  if (!observation) return null;
  observations.push(Object.freeze({ ...observation }));
  while (observations.length > MAX_API_OBSERVATIONS) {
    observations.shift();
  }
  publishObservations();
  return observations[observations.length - 1] || null;
}

export function recordApiObservationFromResponse(response, input, options = {}) {
  const observation = extractApiObservationFromHeaders(response?.headers, {
    ...options,
    url: options.url || input,
    method: options.method || options.init?.method || "GET",
    status: response?.status,
    ok: response?.ok,
  });
  return recordApiObservation(observation);
}

function buildAxiosUrl(config = {}) {
  const url = String(config.url || "");
  if (/^https?:\/\//i.test(url)) return url;
  const baseURL = String(config.baseURL || "").replace(/\/+$/, "");
  if (!baseURL) return url;
  const suffix = url ? `/${url.replace(/^\/+/, "")}` : "";
  return `${baseURL}${suffix}`;
}

export function recordApiObservationFromAxios(response, options = {}) {
  const observation = extractApiObservationFromHeaders(response?.headers, {
    ...options,
    url: options.url || buildAxiosUrl(response?.config),
    method: options.method || response?.config?.method || "POST",
    status: response?.status,
    ok: Number(response?.status) >= 200 && Number(response?.status) < 300,
  });
  return recordApiObservation(observation);
}

export function attachApiObservation(error, observation) {
  if (error && observation) {
    error.apiObservation = observation;
  }
  return error;
}

export function getRecentApiObservations() {
  return observations.map((item) => ({ ...item }));
}

export function __resetApiObservabilityForTests() {
  observations.length = 0;
  if (typeof window !== "undefined") {
    delete window[WINDOW_OBSERVATIONS_KEY];
  }
}
