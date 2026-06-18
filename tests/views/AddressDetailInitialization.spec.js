import { describe, expect, it } from "vitest";

describe("AddressDetail initialization", () => {
  it("starts address assets, summary, and the default transactions tab concurrently", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Account/AddressDetail.vue"), "utf8");

    const txStart = src.indexOf("const txPagePromise = loadTxPage(1);");
    const allSettled = src.indexOf("Promise.allSettled([loadAssets(addr), loadSummary(addr), txPagePromise])");

    expect(txStart).toBeGreaterThan(-1);
    expect(allSettled).toBeGreaterThan(-1);
    expect(txStart).toBeLessThan(allSettled);
    expect(src).not.toContain("await loadAssets(addr);");
    expect(src).toContain("SUMMARY_LOAD_TIMEOUT_MS");
  });
});
