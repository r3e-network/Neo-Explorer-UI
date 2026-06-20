import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import router from "./router";
import i18n, { initializeI18n } from "./lang/i18n.js";
import directives from "./directives";
import { useTheme } from "@/composables/useTheme";
import { initWebVitalsTelemetry } from "@/telemetry/webVitals";
import { explorerQueryClient } from "@/query/client";
import { isChunkLoadError, triggerChunkReload } from "@/utils/chunkReload";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

// Self-hosted fonts (matches the original Google Fonts request and
// avoids the external dependency / CSP relaxation / privacy hop).
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

import "./styles/tailwind.css";

// --- Global error capture, registered BEFORE any async bootstrap work ---
// Previously the window error/rejection handlers were registered only AFTER
// `await initializeI18n()` inside bootstrap, so a failure during early init
// (e.g. a purged locale chunk after a deploy) white-screened the app with zero
// telemetry. These handlers are now installed synchronously at module top; they
// buffer errors until telemetry is ready, then flush them.
let telemetryCapture = null;
const earlyErrorBuffer = [];

function captureGlobal(error, context = {}) {
  if (telemetryCapture) {
    try {
      telemetryCapture(error, context);
    } catch {
      // never let telemetry capture throw out of a handler
    }
  } else {
    earlyErrorBuffer.push([error, context]);
    if (earlyErrorBuffer.length > 50) earlyErrorBuffer.shift();
  }
  if (import.meta.env.DEV) {
    console.error(`[global:${context.source || "error"}]`, error);
  }
}

function setTelemetryCapture(fn) {
  telemetryCapture = fn;
  while (earlyErrorBuffer.length) {
    const [err, ctx] = earlyErrorBuffer.shift();
    try {
      fn(err, ctx);
    } catch {
      // ignore
    }
  }
}

// Expose the capture fn globally so modules that deliberately avoid importing
// telemetry (e.g. the router, to stay test-mockable) can still report errors.
if (typeof globalThis !== "undefined") {
  globalThis.__neoExplorerCaptureError__ = captureGlobal;
}

function renderFatalShell() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("app");
  if (!el) return;
  el.innerHTML =
    '<div style="min-height:60vh;display:flex;align-items:center;justify-content:center;' +
    'font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;color:#e5e7eb;background:#0b0e14">' +
    "<div><h1 style=\"font-size:20px;margin:0 0 8px\">Something went wrong</h1>" +
    '<p style="opacity:.7;margin:0 0 16px;max-width:36ch">The explorer failed to start. This is usually fixed by reloading.</p>' +
    '<button onclick="window.location.reload()" style="padding:8px 16px;border-radius:8px;border:1px solid #374151;' +
    'background:#111827;color:#e5e7eb;cursor:pointer">Reload</button></div></div>';
}

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    captureGlobal(event?.error || event?.message, { source: "window.error" });
  });
  // Catch promise rejections that escape Vue's lifecycle (services, utility
  // modules, top-level bootstrap chains).
  window.addEventListener("unhandledrejection", (event) => {
    captureGlobal(event?.reason, { source: "unhandledrejection" });
  });
}

const appInstance = createApp(App);
appInstance.config.devtools = import.meta.env.DEV;

const { initTheme } = useTheme();
initTheme();
initWebVitalsTelemetry();

async function bootstrap() {
  await initializeI18n();

  if (import.meta.env.VITE_SENTRY_DSN || import.meta.env.VITE_POSTHOG_KEY) {
    const telemetry = await import("@/telemetry/browserTelemetry");
    telemetry.initBrowserTelemetry({ app: appInstance, router });
    setTelemetryCapture(telemetry.captureBrowserTelemetryError);
  }

  // Global Vue error handler — prevents silent failures in components.
  appInstance.config.errorHandler = (err, _instance, info) => {
    captureGlobal(err, { source: "vue", vue: info });
  };

  appInstance.use(router);
  appInstance.use(i18n);
  appInstance.use(VueQueryPlugin, { queryClient: explorerQueryClient });
  appInstance.use(directives);
  appInstance.use(Toast, {
    position: "top-right",
    timeout: 4000,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: "button",
    icon: true,
    rtl: false
  });
  appInstance.mount("#app");
}

bootstrap().catch((error) => {
  captureGlobal(error, { source: "bootstrap" });
  // A stale chunk right after a deploy is recoverable with a single reload.
  // triggerChunkReload has its own loop guard (CHUNK_RELOAD_KEY), so a build
  // that is genuinely broken falls through to the static shell instead of
  // reloading forever.
  if (isChunkLoadError(error) && triggerChunkReload()) {
    return;
  }
  // Otherwise show a static, framework-free shell instead of a blank page.
  renderFatalShell();
});
