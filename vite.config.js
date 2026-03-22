import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import compression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

const DEFAULT_MAINNET_RPC_PRIMARY_PROXY_TARGET = "https://api.n3index.dev";
const DEFAULT_TESTNET_RPC_PRIMARY_PROXY_TARGET = "https://api.n3index.dev";
const DEFAULT_MAINNET_RPC_FALLBACK_PROXY_TARGET = "https://api1.n3index.dev";
const DEFAULT_TESTNET_RPC_FALLBACK_PROXY_TARGET = "https://api1.n3index.dev";
const DEFAULT_MAINNET_BPI_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";
const DEFAULT_TESTNET_BPI_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";
const DEFAULT_INDEXER_PROXY_TARGET = "https://api.n3index.dev";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const mainnetRpcPrimaryTarget = env.VITE_MAINNET_RPC_PRIMARY_PROXY_TARGET || DEFAULT_MAINNET_RPC_PRIMARY_PROXY_TARGET;
  const testnetRpcPrimaryTarget = env.VITE_TESTNET_RPC_PRIMARY_PROXY_TARGET || DEFAULT_TESTNET_RPC_PRIMARY_PROXY_TARGET;
  const mainnetRpcFallbackTarget =
    env.VITE_MAINNET_RPC_FALLBACK_PROXY_TARGET ||
    env.VITE_MAINNET_RPC_PROXY_TARGET ||
    DEFAULT_MAINNET_RPC_FALLBACK_PROXY_TARGET;
  const testnetRpcFallbackTarget =
    env.VITE_TESTNET_RPC_FALLBACK_PROXY_TARGET ||
    env.VITE_TESTNET_RPC_PROXY_TARGET ||
    DEFAULT_TESTNET_RPC_FALLBACK_PROXY_TARGET;

  const mainnetBpiPrimaryTarget = env.VITE_MAINNET_BPI_PRIMARY_PROXY_TARGET || DEFAULT_MAINNET_BPI_PRIMARY_PROXY_TARGET;
  const testnetBpiPrimaryTarget = env.VITE_TESTNET_BPI_PRIMARY_PROXY_TARGET || DEFAULT_TESTNET_BPI_PRIMARY_PROXY_TARGET;
  const indexerProxyTarget = env.VITE_INDEXER_PROXY_TARGET || DEFAULT_INDEXER_PROXY_TARGET;

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
        verbose: false,
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
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
      proxy: {
        "/indexer/mainnet": {
          target: indexerProxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/indexer\/mainnet/, "/indexer/v1/networks/mainnet"),
        },
        "/indexer/testnet": {
          target: indexerProxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/indexer\/testnet/, "/indexer/v1/networks/testnet"),
        },
        "/api/mainnet/primary": {
          target: mainnetRpcPrimaryTarget,
          changeOrigin: true,
          rewrite: () => "/mainnet",
        },
        "/api/mainnet/fallback": {
          target: mainnetRpcFallbackTarget,
          changeOrigin: true,
          rewrite: () => "/mainnet",
        },
        "/api/testnet/primary": {
          target: testnetRpcPrimaryTarget,
          changeOrigin: true,
          rewrite: () => "/testnet",
        },
        "/api/testnet/fallback": {
          target: testnetRpcFallbackTarget,
          changeOrigin: true,
          rewrite: () => "/testnet",
        },
        "/api/mainnet": {
          target: mainnetRpcPrimaryTarget,
          changeOrigin: true,
          rewrite: () => "/mainnet",
        },
        "/api/testnet": {
          target: testnetRpcPrimaryTarget,
          changeOrigin: true,
          rewrite: () => "/testnet",
        },
        "/bpi/mainnet": {
          target: mainnetBpiPrimaryTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bpi\/mainnet/, "/mainnet/bpi"),
        },
        "/bpi/testnet": {
          target: testnetBpiPrimaryTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bpi\/testnet/, "/testnet/bpi"),
        },
        "/bpi": {
          target: mainnetBpiPrimaryTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bpi/, "/mainnet/bpi"),
        },
      },
    },
    optimizeDeps: {
      exclude: ["@r3e/neo-js-sdk/dist/wallet/nep6.js"],
    },
    build: {
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        external: ["node:fs", "fs", "vm"],
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("@r3e/neo-js-sdk")) {
                return "neo-sdk";
              }
              if (id.includes("@cityofzion/neon-js")) {
                return "neon-js";
              }
              if (id.includes("@walletconnect")) {
                return "walletconnect";
              }
              if (
                id.includes("engine.io-client") ||
                id.includes("engine.io-parser") ||
                id.includes("socket.io-client") ||
                id.includes("socket.io-parser") ||
                id.includes("@msgpack/msgpack") ||
                id.includes("multiformats") ||
                id.includes("uint8arrays") ||
                id.includes("/ox/") ||
                id.includes("bowser")
              ) {
                return "walletconnect";
              }
              if (id.includes("@web3auth") || id.includes("@toruslabs")) {
                return "web3auth";
              }
              if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("react-i18next")) {
                return "web3auth";
              }
              if (id.includes("ethers")) {
                return "ethers";
              }
              if (id.includes("@supabase")) {
                return "supabase";
              }
              if (id.includes("highlight.js") || id.includes("@highlightjs") || id.includes("prismjs")) {
                return "syntax";
              }
              if (id.includes("vue") || id.includes("@vue") || id.includes("vue-router")) {
                return "vue-core";
              }
              if (id.includes("axios")) {
                return "axios";
              }
              if (id.includes("qrcode.vue")) {
                return "qrcode";
              }
              if (id.includes("react-qrcode-logo") || id.includes("qrcode-generator")) {
                return "web3auth";
              }
              if (id.includes("ethereum-cryptography") || id.includes("crypto-js")) {
                return "crypto";
              }
              if (id.includes("chart.js")) {
                return "chartjs";
              }
              if (id.includes("core-js") || id.includes("vite-plugin-node-polyfills")) {
                return "polyfills";
              }
              if (id.includes("timeago.js")) {
                return "timeago";
              }
              return "vendor";
            }
          },
        },
      },
    },
  };
});
