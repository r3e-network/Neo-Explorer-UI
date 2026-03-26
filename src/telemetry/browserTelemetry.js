import * as Sentry from "@sentry/vue";
import PostHogModule from "posthog-js";

const posthog = PostHogModule?.default || PostHogModule?.posthog || PostHogModule;
const DEFAULT_SENTRY_TRACE_TARGETS = [
  /^https?:\/\/[^/]+\/api\//i,
  /^https?:\/\/rpc\.r3e\.network/i,
  /^https?:\/\/api(?:[123])?\.n3index\.dev/i,
];

let sentryActive = false;
let routeTrackingAttached = false;

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

function normalizeHost(value, fallback = "") {
  const raw = String(value || "").trim();
  return raw || fallback;
}

function resolveRelease(env = {}) {
  const fromEnv = String(env.VITE_APP_RELEASE || "").trim();
  if (fromEnv) return fromEnv;
  if (typeof __APP_RELEASE__ !== "undefined" && String(__APP_RELEASE__ || "").trim()) {
    return String(__APP_RELEASE__).trim();
  }
  return "";
}

export function resolveBrowserObservabilityConfig(env = {}, hostname = "") {
  const normalizedHost = normalizeHost(hostname).toLowerCase();
  const sentryDsn = String(env.VITE_SENTRY_DSN || "").trim();
  const posthogKey = String(env.VITE_POSTHOG_KEY || "").trim();
  const posthogHost = String(env.VITE_POSTHOG_HOST || "https://us.i.posthog.com")
    .trim()
    .replace(/\/+$/, "");

  const sentry = sentryDsn
      ? {
          dsn: sentryDsn,
          environment: String(env.VITE_SENTRY_ENVIRONMENT || env.MODE || "development").trim(),
          release: resolveRelease(env),
          tracesSampleRate: parseSampleRate(env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
          replaysSessionSampleRate: parseSampleRate(env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0),
          replaysOnErrorSampleRate: parseSampleRate(env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, 1),
        tracePropagationTargets: DEFAULT_SENTRY_TRACE_TARGETS,
      }
    : null;

  const allowDevCapture = parseBoolean(env.VITE_POSTHOG_CAPTURE_DEV, false);
  const posthogDisabled =
    !posthogKey ||
    (!allowDevCapture && ["localhost", "127.0.0.1"].includes(normalizedHost));

  const posthogConfig = posthogKey
    ? {
        key: posthogKey,
        api_host: posthogHost,
        disabled: posthogDisabled,
      }
    : null;

  return {
    sentry,
    posthog: posthogConfig,
  };
}

function buildPosthogPageviewPayload(to) {
  return {
    path: String(to?.fullPath || to?.path || "/"),
    title: typeof document !== "undefined" ? document.title : "",
    url: typeof window !== "undefined" ? window.location.href : "",
    route_name: String(to?.name || ""),
  };
}

export function captureBrowserTelemetryError(error, context = {}) {
  if (!sentryActive) return;

  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined && value !== null && value !== "") {
        scope.setContext(key, { value });
      }
    }
    Sentry.captureException(error);
  });
}

export function initBrowserTelemetry({ app, router, env = import.meta.env } = {}) {
  const hostname =
    typeof window !== "undefined" && window.location?.hostname ? window.location.hostname : "";
  const config = resolveBrowserObservabilityConfig(env, hostname);

  sentryActive = false;

  if (config.sentry) {
    Sentry.init({
      app,
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,
      release: config.sentry.release || undefined,
      sendDefaultPii: false,
      integrations: [
        Sentry.browserTracingIntegration({ router }),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: config.sentry.tracesSampleRate,
      replaysSessionSampleRate: config.sentry.replaysSessionSampleRate,
      replaysOnErrorSampleRate: config.sentry.replaysOnErrorSampleRate,
      tracePropagationTargets: config.sentry.tracePropagationTargets,
    });
    sentryActive = true;
  }

  if (config.posthog && !config.posthog.disabled) {
    posthog.init(config.posthog.key, {
      api_host: config.posthog.api_host,
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: "identified_only",
      disable_session_recording: false,
      loaded: (client) => {
        if (typeof window !== "undefined") {
          client.capture("$pageview", buildPosthogPageviewPayload(router?.currentRoute?.value));
        }
      },
    });

    if (router && !routeTrackingAttached) {
      router.afterEach((to) => {
        posthog.capture("$pageview", buildPosthogPageviewPayload(to));
      });
      routeTrackingAttached = true;
    }
  }

  return config;
}
