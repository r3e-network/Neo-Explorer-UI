import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import compression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

const DEFAULT_MAINNET_RPC_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";
const DEFAULT_TESTNET_RPC_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";
const DEFAULT_MAINNET_RPC_FALLBACK_PROXY_TARGET = "https://neofura.ngd.network";
const DEFAULT_TESTNET_RPC_FALLBACK_PROXY_TARGET = "https://testnet1.neo.coz.io:443";
const DEFAULT_MAINNET_BPI_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";
const DEFAULT_TESTNET_BPI_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";
const DEFAULT_INDEXER_PROXY_TARGET = "https://neo-explorer.jimmy-bf0.workers.dev";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const mainnetRpcPrimaryTarget =
    env.VITE_MAINNET_RPC_PRIMARY_PROXY_TARGET || DEFAULT_MAINNET_RPC_PRIMARY_PROXY_TARGET;
  const testnetRpcPrimaryTarget =
    env.VITE_TESTNET_RPC_PRIMARY_PROXY_TARGET || DEFAULT_TESTNET_RPC_PRIMARY_PROXY_TARGET;
  const mainnetRpcFallbackTarget =
    env.VITE_MAINNET_RPC_FALLBACK_PROXY_TARGET ||
    env.VITE_MAINNET_RPC_PROXY_TARGET ||
    DEFAULT_MAINNET_RPC_FALLBACK_PROXY_TARGET;
  const testnetRpcFallbackTarget =
    env.VITE_TESTNET_RPC_FALLBACK_PROXY_TARGET ||
    env.VITE_TESTNET_RPC_PROXY_TARGET ||
    DEFAULT_TESTNET_RPC_FALLBACK_PROXY_TARGET;

  const mainnetBpiPrimaryTarget =
    env.VITE_MAINNET_BPI_PRIMARY_PROXY_TARGET || DEFAULT_MAINNET_BPI_PRIMARY_PROXY_TARGET;
  const testnetBpiPrimaryTarget =
    env.VITE_TESTNET_BPI_PRIMARY_PROXY_TARGET || DEFAULT_TESTNET_BPI_PRIMARY_PROXY_TARGET;
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
          rewrite: () => "/",
        },
        "/api/testnet/primary": {
          target: testnetRpcPrimaryTarget,
          changeOrigin: true,
          rewrite: () => "/testnet",
        },
        "/api/testnet/fallback": {
          target: testnetRpcFallbackTarget,
          changeOrigin: true,
          rewrite: () => "/",
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
