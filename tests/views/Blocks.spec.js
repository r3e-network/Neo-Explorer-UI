import { describe, expect, it } from "vitest";

describe("Blocks page data loading", () => {
  it("keeps the visible list lightweight while preserving enriched CSV export", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Block/Blocks.vue"), "utf8");

    expect(src).toMatch(/const blockFetchFn = \(limit, skip, opts\) => blockService\.getList\(limit, skip, opts\);/);
    expect(src).toMatch(/blockService\.getList\(limit, offset, \{ __suppressDevErrorLog: true, enrichMissingFields: true \}\)/);
  });
});
