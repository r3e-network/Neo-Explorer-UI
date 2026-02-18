import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import compression from "vite-plugin-compression";
import path from "path";

export default defineConfig({
  plugins: [
    vue(),
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 10240,
    }),
  ],
  resolve: {
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".vue"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "vue-i18n": "vue-i18n/dist/vue-i18n.esm-bundler.js",
    },
  },
  server: {
    proxy: {
      "/api/mainnet": {
        target: "https://neofura.ngd.network",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/mainnet/, "/api"),
      },
      "/api/testnet": {
        target: "https://testmagnet.ngd.network",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/testnet/, "/api"),
      },
      "/bpi/mainnet": {
        target: "https://neofura.ngd.network",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bpi\/mainnet/, "/bpi"),
      },
      "/bpi/testnet": {
        target: "https://testmagnet.ngd.network",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bpi\/testnet/, "/bpi"),
      },
      "/bpi": {
        target: "https://neofura.ngd.network",
        changeOrigin: true,
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  esbuild: {
    drop: ["debugger"],
    pure: ["console.log", "console.warn", "console.info"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "chunk-echarts": ["echarts"],
          "chunk-neon-js": ["@cityofzion/neon-js"],
        },
      },
    },
  },
});
