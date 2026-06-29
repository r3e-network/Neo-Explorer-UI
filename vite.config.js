import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import compression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

// Direct node RPC plus read-api data plane.
const DEFAULT_RPC_PROXY_TARGET = "https://rpc.n3index.dev";
const DEFAULT_TESTNET_RPC_PROXY_TARGET = "https://testnet1.neo.coz.io";
const DEFAULT_INDEXER_PROXY_TARGET = "https://api.n3index.dev";
const DEFAULT_COINGECKO_PROXY_TARGET = "https://api.coingecko.com";
const PRICE_ENDPOINT_PATH = "/api/prices";
const PRICE_UPSTREAM_PATH = "/api/v3/simple/price?ids=neo,gas&vs_currencies=usd&include_24hr_change=true";
const DEV_PRICE_CACHE_TTL_MS = 60 * 1000;
const UNAVAILABLE_PRICE_PAYLOAD = {
  neo: { usd: null, usd_24h_change: null },
  gas: { usd: null, usd_24h_change: null },
  pricingUnavailable: true,
};

let devPriceCache = {
  payload: null,
  fetchedAt: 0,
};

function createDevMultisigApiPlugin() {
  return {
    name: "dev-multisig-api",
    configureServer(server) {
      const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

      // Always register the middleware so /api/multisig/* never falls through
      // to Vite's static-asset handler (which would serve the raw source file).
      // When DATABASE_URL is unset, keep read-only pages inspectable in dev
      // while still blocking mutations that need persistence.
      if (!DATABASE_URL) {
        server.middlewares.use("/api/multisig", (req, res) => {
          if (req.method === "GET" && req.url.startsWith("/requests")) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify([]));
            return;
          }

          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            error: "Multisig mutations require DATABASE_URL in dev.",
          }));
        });
        return;
      }

      server.middlewares.use("/api/multisig", async (req, res, next) => {
        try {
          const url = new URL(req.url, "http://localhost");
          const pathAfterMultisig = url.pathname;

          // Parse JSON body for POST/PATCH
          let body = null;
          if (req.method === "POST" || req.method === "PATCH") {
            body = await new Promise((resolve, reject) => {
              let data = "";
              req.on("data", (chunk) => (data += chunk));
              req.on("end", () => {
                try { resolve(data ? JSON.parse(data) : {}); }
                catch { resolve({}); }
              });
              req.on("error", reject);
            });
          }

          // Build a mock Vercel req/res
          const mockReq = {
            method: req.method,
            query: Object.fromEntries(url.searchParams),
            body,
          };
          const mockRes = {
            _status: 200,
            _headers: {},
            _body: null,
            setHeader(k, v) { this._headers[k] = v; },
            status(code) { this._status = code; return this; },
            json(data) { this._body = data; return this; },
            end() { return this; },
          };

          let handler;
          const idMatch = pathAfterMultisig.match(/^\/requests\/(\d+)/);
          if (idMatch) {
            mockReq.query.id = idMatch[1];
            handler = (await import("./api/multisig/requests/[id].js")).default;
          } else if (pathAfterMultisig.startsWith("/signatures")) {
            handler = (await import("./api/multisig/signatures.js")).default;
          } else if (pathAfterMultisig.startsWith("/requests")) {
            handler = (await import("./api/multisig/requests.js")).default;
          } else {
            return next();
          }

          await handler(mockReq, mockRes);
          res.statusCode = mockRes._status;
          for (const [k, v] of Object.entries(mockRes._headers)) {
            res.setHeader(k, v);
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(mockRes._body));
        } catch (err) {
          console.error("[dev-multisig-api]", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

function createDevPriceProxyPlugin(target) {
  const normalizedTarget = String(target || "").replace(/\/+$/, "");

  return {
    name: "dev-price-proxy",
    configureServer(server) {
      server.middlewares.use(PRICE_ENDPOINT_PATH, async (req, res, next) => {
        if (req.method !== "GET") {
          next();
          return;
        }

        const now = Date.now();
        if (devPriceCache.payload && now - devPriceCache.fetchedAt < DEV_PRICE_CACHE_TTL_MS) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(devPriceCache.payload));
          return;
        }

        try {
          const upstream = await fetch(`${normalizedTarget}${PRICE_UPSTREAM_PATH}`, {
            headers: {
              Accept: "application/json",
              "User-Agent": "neo-explorer-dev-price-proxy/1.0",
            },
          });

          if (!upstream.ok) {
            throw new Error(`Upstream status ${upstream.status}`);
          }

          const payload = await upstream.json();
          devPriceCache = {
            payload,
            fetchedAt: now,
          };

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        } catch (error) {
          if (devPriceCache.payload) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(devPriceCache.payload));
            return;
          }

          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify({
            ...UNAVAILABLE_PRICE_PAYLOAD,
            error: error.message || "Price fetch failed",
          }));
        }
      });
    },
  };
}

export function shouldIgnoreRollupWarning(warning) {
  const message = String(warning?.message || "");
  const id = String(warning?.id || "");

  return (
    (id.includes("/node_modules/ox/") && message.includes("contains an annotation that Rollup cannot interpret")) ||
    message.includes("Circular chunk: vendor -> node-runtime -> vendor")
  );
}

export function getManualChunkName(id) {
  if (id.includes("vite/preload-helper")) {
    return "preload-helper";
  }

  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("@r3e/neo-js-sdk")) {
    return "neo-sdk";
  }
  if (id.includes("@cityofzion/neon-js")) {
    return undefined;
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
  if (
    id.includes("highlight.js") ||
    id.includes("@highlightjs") ||
    id.includes("prismjs") ||
    id.includes("neo-decompiler-web") ||
    id.includes("neo-decompiler-js")
  ) {
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
  if (
    id.includes("@cityofzion/neon-core") ||
    id.includes("/crypto-js/") ||
    id.includes("/elliptic/") ||
    id.includes("/browserify-aes/") ||
    id.includes("/asn1.js/") ||
    id.includes("/hash.js/") ||
    id.includes("/sha.js/") ||
    id.includes("/public-encrypt/") ||
    id.includes("/pbkdf2/") ||
    id.includes("/des.js/") ||
    id.includes("/browserify-sign/") ||
    id.includes("/diffie-hellman/") ||
    id.includes("/parse-asn1/") ||
    id.includes("/create-hash/") ||
    id.includes("/create-hmac/") ||
    id.includes("/browserify-cipher/") ||
    id.includes("/browserify-des/") ||
    id.includes("/browserify-rsa/") ||
    id.includes("/crypto-browserify/") ||
    id.includes("/bn.js/") ||
    id.includes("/hmac-drbg/") ||
    id.includes("/brorand/") ||
    id.includes("/base64url/") ||
    id.includes("/blakejs/") ||
    id.includes("/ripemd160/") ||
    id.includes("/miller-rabin/") ||
    id.includes("/create-ecdh/")
  ) {
    return "legacy-crypto";
  }
  if (id.includes("/ox/") || id.includes("@ethereumjs/util")) {
    return "ox";
  }
  if (id.includes("/pino") || id.includes("/safe-stable-stringify")) {
    return "pino";
  }
  if (
    id.includes("/buffer/") ||
    id.includes("/readable-stream/") ||
    id.includes("/string_decoder/") ||
    id.includes("/safe-buffer/") ||
    id.includes("/process/") ||
    id.includes("/events/") ||
    id.includes("/util/") ||
    id.includes("/inherits/") ||
    id.includes("/stream-browserify/") ||
    id.includes("/base64-js/") ||
    id.includes("/ieee754/") ||
    id.includes("/core-util-is/") ||
    id.includes("/process-nextick-args/") ||
    id.includes("/util-deprecate/") ||
    id.includes("/isarray/") ||
    id.includes("/is-arguments/") ||
    id.includes("/is-generator-function/") ||
    id.includes("/is-typed-array/") ||
    id.includes("/which-typed-array/") ||
    id.includes("/call-bind") ||
    id.includes("/get-intrinsic/") ||
    id.includes("/get-proto/") ||
    id.includes("/dunder-proto/") ||
    id.includes("/has-symbols/") ||
    id.includes("/has-tostringtag/")
  ) {
    return "node-runtime";
  }
  if (id.includes("http-proxy-agent") || id.includes("https-proxy-agent") || id.includes("proxy-from-env")) {
    return "proxy-agents";
  }
  // ethereum-cryptography stays in vendor to avoid circular dependency with crypto polyfills
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appRelease =
    String(env.VITE_APP_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || "dev")
      .trim() || "dev";
  // Split node RPC from the read-api data plane.
  const rpcTarget = env.VITE_RPC_PROXY_TARGET || DEFAULT_RPC_PROXY_TARGET;
  const testnetRpcTarget = env.VITE_TESTNET_RPC_PROXY_TARGET || DEFAULT_TESTNET_RPC_PROXY_TARGET;
  const indexerTarget = env.VITE_INDEXER_PROXY_TARGET || DEFAULT_INDEXER_PROXY_TARGET;
  const coingeckoProxyTarget = env.VITE_COINGECKO_PROXY_TARGET || DEFAULT_COINGECKO_PROXY_TARGET;

  return {
    plugins: [
      vue(),
      createDevMultisigApiPlugin(),
      createDevPriceProxyPlugin(coingeckoProxyTarget),
      nodePolyfills({
        include: ["buffer", "crypto", "stream", "util", "events", "process"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
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
        "@web3auth/auth": path.resolve(__dirname, "./node_modules/@web3auth/auth/dist/auth.esm.js"),
        "vue-i18n": "vue-i18n/dist/vue-i18n.esm-bundler.js",
      },
    },
    define: {
      __APP_RELEASE__: JSON.stringify(appRelease),
    },
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
      proxy: {
        // Node RPC goes direct; indexer/read-api routes stay on api.n3index.dev.
        "/data/mainnet": { target: indexerTarget, changeOrigin: true, rewrite: (p) => p.replace(/^\/data\/mainnet(?:\/fallback\d?)?/, "/mainnet") },
        "/data/testnet": { target: indexerTarget, changeOrigin: true, rewrite: (p) => p.replace(/^\/data\/testnet(?:\/fallback\d?)?/, "/testnet") },
        "/indexer/mainnet": { target: indexerTarget, changeOrigin: true, rewrite: (p) => p.replace(/^\/indexer\/mainnet(?:\/fallback\d?)?/, "/mainnet") },
        "/indexer/testnet": { target: indexerTarget, changeOrigin: true, rewrite: (p) => p.replace(/^\/indexer\/testnet(?:\/fallback\d?)?/, "/testnet") },
        "/rpc/mainnet": { target: rpcTarget, changeOrigin: true, rewrite: () => "/mainnet" },
        "/rpc/testnet": { target: testnetRpcTarget, changeOrigin: true, rewrite: () => "/" },
        "/api/mainnet": { target: indexerTarget, changeOrigin: true, rewrite: () => "/mainnet" },
        "/api/testnet": { target: indexerTarget, changeOrigin: true, rewrite: () => "/testnet" },
        "/rest/mainnet": { target: indexerTarget, changeOrigin: true, rewrite: (p) => p.replace(/^\/rest\/mainnet/, "/rest/v1") },
        "/rest/testnet": { target: indexerTarget, changeOrigin: true, rewrite: (p) => p.replace(/^\/rest\/testnet/, "/rest/v1") },
      },
    },
    optimizeDeps: {
      exclude: ["@r3e/neo-js-sdk/dist/wallet/nep6.js", "neo-decompiler-web"],
    },
    build: {
      modulePreload: false,
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        onwarn(warning, warn) {
          if (shouldIgnoreRollupWarning(warning)) {
            return;
          }
          warn(warning);
        },
        external: ["node:fs", "fs", "vm"],
        output: {
          manualChunks(id) {
            return getManualChunkName(id);
          },
        },
      },
    },
  };
});
