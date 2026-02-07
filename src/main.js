import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import i18n from "./lang/i18n.js";
import directives from "./directives";

import "./styles/tailwind.css";

const appInstance = createApp(App);
appInstance.config.devtools = true;
appInstance.use(router);
appInstance.use(i18n);
appInstance.use(directives);
appInstance.mount("#app");
