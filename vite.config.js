import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import compression from "vite-plugin-compression";
import path from "path";

const DEFAULT_MAINNET_RPC_PROXY_TARGET = "http://198.244.215.132:1927";
const DEFAULT_TESTNET_RPC_PROXY_TARGET = "http://198.244.215.132:1926";
const DEFAULT_MAINNET_BPI_PROXY_TARGET = "http://198.244.215.132:1927";
const DEFAULT_TESTNET_BPI_PROXY_TARGET = "http://198.244.215.132:1926";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const mainnetRpcTarget = env.VITE_MAINNET_RPC_PROXY_TARGET || DEFAULT_MAINNET_RPC_PROXY_TARGET;
  const testnetRpcTarget = env.VITE_TESTNET_RPC_PROXY_TARGET || DEFAULT_TESTNET_RPC_PROXY_TARGET;
  const mainnetBpiTarget = env.VITE_MAINNET_BPI_PROXY_TARGET || DEFAULT_MAINNET_BPI_PROXY_TARGET;
  const testnetBpiTarget = env.VITE_TESTNET_BPI_PROXY_TARGET || DEFAULT_TESTNET_BPI_PROXY_TARGET;

  return {
    plugins: [
      vue(),
      compression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 10240,
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
      proxy: {
        "/api/mainnet": {
          target: mainnetRpcTarget,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/api/testnet": {
          target: testnetRpcTarget,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/bpi/mainnet": {
          target: mainnetBpiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bpi\/mainnet/, "/bpi"),
        },
        "/bpi/testnet": {
          target: testnetBpiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bpi\/testnet/, "/bpi"),
        },
        "/api": {
          target: mainnetRpcTarget,
          changeOrigin: true,
          rewrite: () => "/",
        },
        "/bpi": {
          target: mainnetBpiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bpi/, "/bpi"),
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
        output: {},
      },
    },
  };
});
