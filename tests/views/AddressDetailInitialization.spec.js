import { describe, expect, it } from "vitest";

describe("AddressDetail initialization", () => {
  it("starts the default transactions tab before waiting for asset summary data", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Account/AddressDetail.vue"), "utf8");

    const txStart = src.indexOf("const txPagePromise = loadTxPage(1);");
    const assetsAwait = src.indexOf("await loadAssets(addr);");

    expect(txStart).toBeGreaterThan(-1);
    expect(assetsAwait).toBeGreaterThan(-1);
    expect(txStart).toBeLessThan(assetsAwait);
    expect(src).toMatch(/Promise\.allSettled\(\[loadSummary\(addr\), txPagePromise\]\)/);
  });
});
