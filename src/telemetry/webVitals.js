const MAX_WEB_VITALS = 40;
const WINDOW_WEB_VITALS_KEY = "__NEO_EXPLORER_WEB_VITALS__";

const observations = [];
const observers = [];
let initialized = false;
let cumulativeLayoutShift = 0;
let maxInteractionDelay = 0;

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")
  );
}

function currentRoute() {
  if (typeof window === "undefined") return "";
  return `${window.location?.pathname || ""}${window.location?.search || ""}`;
}

function ratingForMetric(name, value) {
  const metric = String(name || "").toUpperCase();
  const number = Number(value);
  if (!Number.isFinite(number)) return "unknown";

  if (metric === "LCP") {
    if (number <= 2500) return "good";
    if (number <= 4000) return "needs-improvement";
    return "poor";
  }
  if (metric === "CLS") {
    if (number <= 0.1) return "good";
    if (number <= 0.25) return "needs-improvement";
    return "poor";
  }
  if (metric === "INP") {
    if (number <= 200) return "good";
    if (number <= 500) return "needs-improvement";
    return "poor";
  }
  if (metric === "LONG_TASK") {
    if (number <= 50) return "good";
    if (number <= 200) return "needs-improvement";
    return "poor";
  }
  return "unknown";
}

function publishWebVitals() {
  if (typeof window === "undefined") return;
  window[WINDOW_WEB_VITALS_KEY] = getRecentWebVitals();
}

export function recordWebVital(metric) {
  const name = String(metric?.name || "").trim();
  const value = Number(metric?.value);
  if (!name || !Number.isFinite(value)) return null;

  observations.push(Object.freeze(compactObject({
    timestamp: new Date().toISOString(),
    route: metric.route || currentRoute(),
    name: name.toUpperCase(),
    value,
    rating: metric.rating || ratingForMetric(name, value),
    entryType: metric.entryType,
    target: metric.target,
  })));
  while (observations.length > MAX_WEB_VITALS) {
    observations.shift();
  }
  publishWebVitals();
  return observations[observations.length - 1] || null;
}

function canObserve(type) {
  if (typeof PerformanceObserver === "undefined") return false;
  const supported = PerformanceObserver.supportedEntryTypes;
  if (!Array.isArray(supported)) return true;
  return supported.includes(type);
}

function observePerformanceType(type, handler, options = {}) {
  if (!canObserve(type)) return;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        handler(entry);
      }
    });
    observer.observe({ type, buffered: true, ...options });
    observers.push(observer);
  } catch {
    // Browser support varies across Safari/Firefox/Chrome; telemetry must
    // never affect rendering or app boot.
  }
}

export function initWebVitalsTelemetry() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  observePerformanceType("largest-contentful-paint", (entry) => {
    recordWebVital({
      name: "LCP",
      value: Number(entry.startTime || 0),
      entryType: entry.entryType,
    });
  });

  observePerformanceType("layout-shift", (entry) => {
    if (entry.hadRecentInput) return;
    cumulativeLayoutShift += Number(entry.value || 0);
    recordWebVital({
      name: "CLS",
      value: cumulativeLayoutShift,
      entryType: entry.entryType,
    });
  });

  observePerformanceType("event", (entry) => {
    const duration = Number(entry.duration || 0);
    if (!Number.isFinite(duration) || duration <= maxInteractionDelay) return;
    maxInteractionDelay = duration;
    recordWebVital({
      name: "INP",
      value: duration,
      entryType: entry.entryType,
      target: entry.name,
    });
  }, { durationThreshold: 40 });

  observePerformanceType("longtask", (entry) => {
    recordWebVital({
      name: "LONG_TASK",
      value: Number(entry.duration || 0),
      entryType: entry.entryType,
      target: entry.name,
    });
  });
}

export function getRecentWebVitals() {
  return observations.map((item) => ({ ...item }));
}

export function __resetWebVitalsForTests() {
  observations.length = 0;
  cumulativeLayoutShift = 0;
  maxInteractionDelay = 0;
  initialized = false;
  while (observers.length) {
    const observer = observers.pop();
    if (typeof observer?.disconnect === "function") observer.disconnect();
  }
  if (typeof window !== "undefined") {
    delete window[WINDOW_WEB_VITALS_KEY];
  }
}
