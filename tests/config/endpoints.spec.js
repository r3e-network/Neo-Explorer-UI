import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());

const readFile = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("endpoint defaults", () => {
  it("keeps vite proxy defaults on external non-self-hosted endpoints", () => {
    const viteConfig = readFile("vite.config.js");

    expect(viteConfig).toContain('const DEFAULT_MAINNET_RPC_PROXY_TARGET = "https://neofura.ngd.network";');
    expect(viteConfig).toContain('const DEFAULT_TESTNET_RPC_PROXY_TARGET = "https://testmagnet.ngd.network";');
    expect(viteConfig).toContain('const DEFAULT_MAINNET_BPI_PROXY_TARGET = "https://neofura.ngd.network";');
    expect(viteConfig).toContain('const DEFAULT_TESTNET_BPI_PROXY_TARGET = "https://testmagnet.ngd.network";');

    expect(viteConfig).not.toMatch(/198\.244\.215\.132/);
    expect(viteConfig).not.toContain("testneofura.ngd.network");
  });

  it("keeps vercel rewrites on external non-self-hosted endpoints", () => {
    const vercelConfig = JSON.parse(readFile("vercel.json"));
    const rewrites = vercelConfig.rewrites || [];

    const routeDest = (source) =>
      rewrites.find((rewrite) => rewrite.source === source)?.destination;

    expect(routeDest("/api/mainnet/primary")).toBe("https://neofura.ngd.network");
    expect(routeDest("/api/mainnet/fallback")).toBe("https://neofura.ngd.network");
    expect(routeDest("/api/testnet/primary")).toBe("https://testmagnet.ngd.network");
    expect(routeDest("/api/testnet/fallback")).toBe("https://testmagnet.ngd.network");
    expect(routeDest("/api/mainnet")).toBe("https://neofura.ngd.network");
    expect(routeDest("/api/testnet")).toBe("https://testmagnet.ngd.network");
    expect(routeDest("/bpi/mainnet/(.*)")).toBe("https://neofura.ngd.network/bpi/$1");
    expect(routeDest("/bpi/testnet/(.*)")).toBe("https://testmagnet.ngd.network/bpi/$1");

    const serialized = JSON.stringify(vercelConfig);
    expect(serialized).not.toMatch(/198\.244\.215\.132/);
    expect(serialized).not.toContain("testneofura.ngd.network");
  });
});
