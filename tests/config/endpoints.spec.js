import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());

const readFile = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("endpoint defaults", () => {
  it("keeps vite proxy defaults on external non-self-hosted endpoints", () => {
    const viteConfig = readFile("vite.config.js");

    expect(viteConfig).toContain('const DEFAULT_MAINNET_RPC_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";');
    expect(viteConfig).toContain('const DEFAULT_TESTNET_RPC_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";');
    expect(viteConfig).toContain('const DEFAULT_MAINNET_RPC_FALLBACK_PROXY_TARGET = "https://neofura.ngd.network";');
    expect(viteConfig).toContain('const DEFAULT_TESTNET_RPC_FALLBACK_PROXY_TARGET = "https://testnet1.neo.coz.io:443";');
    expect(viteConfig).toContain('const DEFAULT_MAINNET_BPI_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";');
    expect(viteConfig).toContain('const DEFAULT_TESTNET_BPI_PRIMARY_PROXY_TARGET = "https://rpc.r3e.network";');
    expect(viteConfig).toContain('const DEFAULT_INDEXER_PROXY_TARGET = "https://api.n3index.dev";');
    expect(viteConfig).toContain('rewrite: (p) => p.replace(/^\\/indexer\\/mainnet/, "/indexer/v1/networks/mainnet"),');
    expect(viteConfig).toContain('rewrite: (p) => p.replace(/^\\/indexer\\/testnet/, "/indexer/v1/networks/testnet"),');

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

  it("keeps vercel rewrites on external non-self-hosted endpoints", () => {
    const vercelConfig = JSON.parse(readFile("vercel.json"));
    const rewrites = vercelConfig.rewrites || [];

    const routeDest = (source) =>
      rewrites.find((rewrite) => rewrite.source === source)?.destination;

    expect(routeDest("/api/mainnet/primary")).toBe("https://rpc.r3e.network/mainnet");
    expect(routeDest("/api/mainnet/fallback")).toBe("https://neofura.ngd.network");
    expect(routeDest("/api/testnet/primary")).toBe("https://rpc.r3e.network/testnet");
    expect(routeDest("/api/testnet/fallback")).toBe("https://testnet1.neo.coz.io:443");
    expect(routeDest("/api/mainnet")).toBe("https://rpc.r3e.network/mainnet");
    expect(routeDest("/api/testnet")).toBe("https://rpc.r3e.network/testnet");
    expect(routeDest("/bpi/mainnet/(.*)")).toBe("https://rpc.r3e.network/mainnet/bpi/$1");
    expect(routeDest("/bpi/testnet/(.*)")).toBe("https://rpc.r3e.network/testnet/bpi/$1");
    expect(routeDest("/indexer/mainnet/(.*)")).toBe(
      "https://api.n3index.dev/indexer/v1/networks/mainnet/$1"
    );
    expect(routeDest("/indexer/testnet/(.*)")).toBe(
      "https://api.n3index.dev/indexer/v1/networks/testnet/$1"
    );

    const serialized = JSON.stringify(vercelConfig);
    expect(serialized).not.toMatch(/198\.244\.215\.132/);
    expect(serialized).not.toContain("testneofura.ngd.network");
  });
});
