// @vitest-environment node

import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { getManualChunkName, shouldIgnoreRollupWarning } from "../../vite.config.js";

describe("vite config warning and chunk helpers", () => {
  it("splits heavy ox and logging dependencies out of vendor", () => {
    expect(getManualChunkName("\0vite/preload-helper.js")).toBe("preload-helper");
    expect(getManualChunkName("/tmp/node_modules/ox/_esm/core/Base64.js")).toBe("ox");
    expect(getManualChunkName("/tmp/node_modules/pino/file.js")).toBe("pino");
    expect(getManualChunkName("/tmp/node_modules/@cityofzion/neon-js/lib/index.js")).toBeUndefined();
    expect(getManualChunkName("/tmp/node_modules/@cityofzion/neon-core/lib/index.js")).toBe("legacy-crypto");
    expect(getManualChunkName("/tmp/node_modules/crypto-js/index.js")).toBe("legacy-crypto");
    expect(getManualChunkName("/tmp/node_modules/http-proxy-agent/dist/index.js")).toBe("proxy-agents");
    expect(getManualChunkName("/tmp/node_modules/readable-stream/lib/_stream_readable.js")).toBe("node-runtime");
  });

  it("suppresses the known ox PURE annotation warning", () => {
    expect(
      shouldIgnoreRollupWarning({
        id: "/tmp/node_modules/ox/_esm/core/Base64.js",
        message:
          'node_modules/ox/_esm/core/Base64.js (6:27): A comment "/*#__PURE__*/" contains an annotation that Rollup cannot interpret due to the position of the comment.',
      }),
    ).toBe(true);
  });

  it("suppresses the known vendor/node-runtime circular chunk warning", () => {
    expect(
      shouldIgnoreRollupWarning({
        message: "Circular chunk: vendor -> node-runtime -> vendor. Please adjust the manual chunk logic for these chunks.",
      }),
    ).toBe(true);
  });

  it("disables modulepreload generation for the app shell", () => {
    const viteConfig = fs.readFileSync(new URL("../../vite.config.js", import.meta.url), "utf8");
    expect(viteConfig).toContain("modulePreload: false");
  });

  it("aliases Web3Auth auth to its direct ESM build for leaner bundling", () => {
    const viteConfig = fs.readFileSync(new URL("../../vite.config.js", import.meta.url), "utf8");
    expect(viteConfig).toContain('"@web3auth/auth": path.resolve(__dirname, "./node_modules/@web3auth/auth/dist/auth.esm.js")');
  });

  it("keeps the dev multisig proposal list readable when DATABASE_URL is absent", () => {
    const viteConfig = fs.readFileSync(new URL("../../vite.config.js", import.meta.url), "utf8");
    expect(viteConfig).toContain('if (req.method === "GET" && req.url.startsWith("/requests"))');
    expect(viteConfig).toContain("res.statusCode = 200");
    expect(viteConfig).toContain("JSON.stringify([])");
    expect(viteConfig).toContain("Multisig mutations require DATABASE_URL in dev.");
  });

  it("keeps the dev price endpoint as a readable unavailable payload when CoinGecko is down", () => {
    const viteConfig = fs.readFileSync(new URL("../../vite.config.js", import.meta.url), "utf8");
    expect(viteConfig).toContain("pricingUnavailable: true");
    expect(viteConfig).toContain('res.setHeader("Cache-Control", "no-store")');
    expect(viteConfig).not.toContain('res.statusCode = 502');
  });
});
