import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());

const readFile = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("endpoint defaults", () => {
  it("keeps vite proxy defaults on a single external endpoint", () => {
    const viteConfig = readFile("vite.config.js");

    expect(viteConfig).toContain('const DEFAULT_RPC_PROXY_TARGET = "https://rpc.n3index.dev";');
    expect(viteConfig).toContain('const DEFAULT_INDEXER_PROXY_TARGET = "https://api.n3index.dev";');
    expect(viteConfig).toContain('"/rpc/mainnet": {');
    expect(viteConfig).toContain('"/rpc/testnet": {');
    expect(viteConfig).toContain('"/data/mainnet": {');
    expect(viteConfig).toContain('"/data/testnet": {');

    expect(viteConfig).not.toMatch(/198\.244\.215\.132/);
    expect(viteConfig).not.toContain("testneofura.ngd.network");
  });

  it("configures compression plugin with verbose logging disabled", () => {
    const viteConfig = readFile("vite.config.js");
    expect(viteConfig).toContain("verbose: false");
  });



  it("keeps a fallback vendor chunk for residual third-party modules", () => {
    const viteConfig = readFile("vite.config.js");
    expect(viteConfig).toContain('return "vendor";');
  });

  it("raises the chunk warning limit to the tuned post-split baseline", () => {
    const viteConfig = readFile("vite.config.js");
    expect(viteConfig).toContain("chunkSizeWarningLimit: 1100");
  });

  it("splits large third-party libraries into dedicated chunks", () => {
    const viteConfig = readFile("vite.config.js");
    expect(viteConfig).toContain('if (id.includes("ethers")) {');
    expect(viteConfig).toContain('return "ethers";');
    expect(viteConfig).toContain('if (id.includes("@supabase")) {');
    expect(viteConfig).toContain('return "supabase";');

    expect(viteConfig).toContain('id.includes("engine.io-client") ||');
    expect(viteConfig).toContain('return "walletconnect";');
    expect(viteConfig).toContain('id.includes("/react/") || id.includes("/react-dom/") || id.includes("react-i18next")');
    expect(viteConfig).toContain('return "web3auth";');
    expect(viteConfig).toContain('id.includes("react-qrcode-logo") || id.includes("qrcode-generator")');
    expect(viteConfig).toContain('if (id.includes("highlight.js") || id.includes("@highlightjs") || id.includes("prismjs")) {');
    expect(viteConfig).toContain('return "syntax";');
  });

  it("keeps vercel rewrites on direct node RPC plus the read-api data plane", () => {
    const vercelConfig = JSON.parse(readFile("vercel.json"));
    const rewrites = vercelConfig.rewrites || [];

    const routeDest = (source) =>
      rewrites.find((rewrite) => rewrite.source === source)?.destination;

    expect(routeDest("/rpc/mainnet/primary")).toBe("https://rpc.n3index.dev/mainnet");
    expect(routeDest("/rpc/mainnet/fallback")).toBe("https://api.n3index.dev/mainnet");
    expect(routeDest("/rpc/mainnet/fallback2")).toBe("https://api.n3index.dev/mainnet");
    expect(routeDest("/rpc/mainnet/fallback3")).toBe("https://api.n3index.dev/mainnet");
    expect(routeDest("/rpc/testnet/primary")).toBe("https://testnet1.neo.coz.io");
    expect(routeDest("/rpc/testnet/fallback")).toBe("https://api.n3index.dev/testnet");
    expect(routeDest("/rpc/testnet/fallback2")).toBe("https://api.n3index.dev/testnet");
    expect(routeDest("/rpc/testnet/fallback3")).toBe("https://api.n3index.dev/testnet");
    expect(routeDest("/rpc/mainnet")).toBe("https://rpc.n3index.dev/mainnet");
    expect(routeDest("/rpc/testnet")).toBe("https://testnet1.neo.coz.io");
    expect(routeDest("/data/mainnet/fallback/(.*)")).toBe(
      "https://api.n3index.dev/mainnet/$1"
    );
    expect(routeDest("/data/mainnet/fallback2/(.*)")).toBe(
      "https://api.n3index.dev/mainnet/$1"
    );
    expect(routeDest("/data/mainnet/fallback3/(.*)")).toBe(
      "https://api.n3index.dev/mainnet/$1"
    );
    expect(routeDest("/data/mainnet/(.*)")).toBe(
      "https://api.n3index.dev/mainnet/$1"
    );
    expect(routeDest("/data/testnet/fallback/(.*)")).toBe(
      "https://api.n3index.dev/testnet/$1"
    );
    expect(routeDest("/data/testnet/fallback2/(.*)")).toBe(
      "https://api.n3index.dev/testnet/$1"
    );
    expect(routeDest("/data/testnet/fallback3/(.*)")).toBe(
      "https://api.n3index.dev/testnet/$1"
    );
    expect(routeDest("/data/testnet/(.*)")).toBe(
      "https://api.n3index.dev/testnet/$1"
    );
    expect(routeDest("/:path((?!api/|rpc/|bpi/|indexer/|data/|assets/|img/|.*\\..*).*)")).toBe("/index.html");

    const serialized = JSON.stringify(vercelConfig);
    expect(serialized).not.toMatch(/198\.244\.215\.132/);
    expect(serialized).not.toContain("testneofura.ngd.network");
  });
});
