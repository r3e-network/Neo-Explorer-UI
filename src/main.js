import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import i18n from "./lang/i18n.js";
import directives from "./directives";

import "./styles/tailwind.css";

const appInstance = createApp(App);
appInstance.config.devtools = process.env.NODE_ENV !== "production";

// Global error handler — prevents silent failures in components
appInstance.config.errorHandler = (err, _instance, info) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[Vue Error] ${info}:`, err);
  }
};

appInstance.use(router);
appInstance.use(i18n);
appInstance.use(directives);
appInstance.mount("#app");
