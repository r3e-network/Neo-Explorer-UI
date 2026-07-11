let initialized = false;
let sentryModulePromise = null;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parseSampleRate(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

async function loadSentry() {
  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/node").then((mod) => mod.default || mod);
  }
  return sentryModulePromise;
}

function isTelemetryEnabled() {
  if (!process.env.SENTRY_DSN) return false;
  return parseBoolean(process.env.SENTRY_ENABLED, true);
}

async function initApiTelemetry() {
  if (initialized || !isTelemetryEnabled()) return isTelemetryEnabled();

  const Sentry = await loadSentry();
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0),
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
  });
  initialized = true;
  return true;
}

async function captureApiException(error, { route = "", req = null, extraContext = null } = {}) {
  if (!(await initApiTelemetry())) return false;

  const Sentry = await loadSentry();
  Sentry.withScope((scope) => {
    if (route) scope.setTag("api.route", route);
    if (req?.method) scope.setTag("http.method", req.method);
    if (req) {
      scope.setContext("request", {
        method: req.method || "",
        url: req.url || "",
        userAgent: req.headers?.["user-agent"] || "",
        forwardedFor: req.headers?.["x-forwarded-for"] || "",
      });
    }
    if (extraContext && typeof extraContext === "object") {
      scope.setContext("extra", extraContext);
    }
    Sentry.captureException(error);
  });

  try {
    await Sentry.flush(2000);
  } catch {
    // no-op
  }
  return true;
}

function withApiTelemetry(route, handler) {
  async function wrappedHandler(req, res) {
    try {
      return await handler(req, res);
    } catch (error) {
      await captureApiException(error, { route, req });
      throw error;
    }
  }
  return Object.assign(wrappedHandler, handler);
}

module.exports = {
  captureApiException,
  initApiTelemetry,
  withApiTelemetry,
};
