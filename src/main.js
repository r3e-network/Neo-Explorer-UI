import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import router from "./router";
import i18n, { initializeI18n } from "./lang/i18n.js";
import directives from "./directives";
import { useTheme } from "@/composables/useTheme";
import { initWebVitalsTelemetry } from "@/telemetry/webVitals";
import { explorerQueryClient } from "@/query/client";
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

const appInstance = createApp(App);
appInstance.config.devtools = import.meta.env.DEV;

const { initTheme } = useTheme();
initTheme();
initWebVitalsTelemetry();

async function bootstrap() {
  await initializeI18n();

  let captureBrowserTelemetryError = () => {};
  if (import.meta.env.VITE_SENTRY_DSN || import.meta.env.VITE_POSTHOG_KEY) {
    const telemetry = await import("@/telemetry/browserTelemetry");
    telemetry.initBrowserTelemetry({ app: appInstance, router });
    captureBrowserTelemetryError = telemetry.captureBrowserTelemetryError;
  }

  // Global error handler — prevents silent failures in components
  appInstance.config.errorHandler = (err, _instance, info) => {
    captureBrowserTelemetryError(err, { vue: info });
    if (import.meta.env.DEV) {
      console.error(`[Vue Error] ${info}:`, err);
    }
  };

  // Catch promise rejections that escape Vue's lifecycle (services, utility
  // modules, top-level bootstrap chains). Without this, Sentry only sees
  // errors thrown from within component setup/render.
  if (typeof window !== "undefined") {
    window.addEventListener("unhandledrejection", (event) => {
      captureBrowserTelemetryError(event.reason, { source: "unhandledrejection" });
      if (import.meta.env.DEV) {
        console.error("[unhandledrejection]:", event.reason);
      }
    });
  }

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

bootstrap();
