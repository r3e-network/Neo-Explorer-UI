import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import i18n, { initializeI18n } from "./lang/i18n.js";
import directives from "./directives";
import { useTheme } from "@/composables/useTheme";
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

  appInstance.use(router);
  appInstance.use(i18n);
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
