import { reactive } from "vue";

// Simple reactive store
export const store = reactive({
  network: localStorage.getItem("net") || "mainnet",
  theme: localStorage.getItem("theme") || "light",
  loading: false,
});

export const actions = {
  setNetwork(net) {
    store.network = net;
    localStorage.setItem("net", net);
  },
  setTheme(theme) {
    store.theme = theme;
    localStorage.setItem("theme", theme);
  },
};

export default { store, actions };
