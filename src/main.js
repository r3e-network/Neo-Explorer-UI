import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import i18n, { initializeI18n } from "./lang/i18n.js";
import directives from "./directives";
import { useTheme } from "@/composables/useTheme";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

import "./styles/tailwind.css";

const appInstance = createApp(App);
appInstance.config.devtools = import.meta.env.DEV;

const { initTheme } = useTheme();
initTheme();

async function bootstrap() {
  await initializeI18n();

  // Global error handler — prevents silent failures in components
  appInstance.config.errorHandler = (err, _instance, info) => {
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
