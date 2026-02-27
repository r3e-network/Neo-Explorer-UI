import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import compression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

const DEFAULT_MAINNET_RPC_PROXY_TARGET = "https://neofura.ngd.network";
const DEFAULT_TESTNET_RPC_PROXY_TARGET = "https://testmagnet.ngd.network";
const DEFAULT_MAINNET_BPI_PROXY_TARGET = "https://neofura.ngd.network";
const DEFAULT_TESTNET_BPI_PROXY_TARGET = "https://testmagnet.ngd.network";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      vue(),
      nodePolyfills({
        include: ["buffer", "crypto", "stream", "util", "events", "process"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      compression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 10240,
        deleteOriginFile: false,
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
        "/neotube-api": {
          target: "https://api.neotube.io",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/neotube-api/, ""),
        },
        "/api/mainnet/primary": {
          target: env.VITE_MAINNET_RPC_PROXY_TARGET || DEFAULT_MAINNET_RPC_PROXY_TARGET,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/api/mainnet/fallback": {
          target: env.VITE_MAINNET_RPC_PROXY_TARGET || DEFAULT_MAINNET_RPC_PROXY_TARGET,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/api/testnet/primary": {
          target: env.VITE_TESTNET_RPC_PROXY_TARGET || DEFAULT_TESTNET_RPC_PROXY_TARGET,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/api/testnet/fallback": {
          target: env.VITE_TESTNET_RPC_PROXY_TARGET || DEFAULT_TESTNET_RPC_PROXY_TARGET,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/api/mainnet": {
          target: env.VITE_MAINNET_RPC_PROXY_TARGET || DEFAULT_MAINNET_RPC_PROXY_TARGET,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/api/testnet": {
          target: env.VITE_TESTNET_RPC_PROXY_TARGET || DEFAULT_TESTNET_RPC_PROXY_TARGET,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/bpi/mainnet": {
          target: env.VITE_MAINNET_BPI_PROXY_TARGET || DEFAULT_MAINNET_BPI_PROXY_TARGET,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bpi\/mainnet/, "/bpi"),
        },
        "/bpi/testnet": {
          target: env.VITE_TESTNET_BPI_PROXY_TARGET || DEFAULT_TESTNET_BPI_PROXY_TARGET,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bpi\/testnet/, "/bpi"),
        },
        "/bpi": {
          target: env.VITE_MAINNET_BPI_PROXY_TARGET || DEFAULT_MAINNET_BPI_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("@cityofzion/neon-js")) {
                return "neon-js";
              }
              if (id.includes("@walletconnect")) {
                return "walletconnect";
              }
              if (id.includes("@web3auth")) {
                return "web3auth";
              }
              if (id.includes("vue") || id.includes("@vue") || id.includes("vue-router")) {
                return "vue-core";
              }
              if (id.includes("echarts")) {
                return "echarts";
              }
              if (id.includes("axios")) {
                return "axios";
              }
              if (id.includes("@toruslabs") || id.includes("@web3auth")) {
                return "web3auth";
              }

              return "vendor";
            }
          },
        },
      },
    },
  };
});
