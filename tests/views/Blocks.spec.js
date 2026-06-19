import { describe, expect, it } from "vitest";

describe("Blocks page data loading", () => {
  it("keeps the visible list lightweight while preserving enriched CSV export", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Block/Blocks.vue"), "utf8");

    expect(src).toMatch(/const blockFetchFn = async \(limit, skip, opts\) =>/);
    expect(src).toContain("const validatorIdentityPromise = waitForValidatorIdentity();");
    expect(src).toContain("const page = await blockService.getList(limit, skip, opts);");
    expect(src).toMatch(/blockService\.getList\(limit, offset, \{ __suppressDevErrorLog: true, enrichMissingFields: true \}\)/);
  });

  it("preloads validator identity before publishing block rows", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Block/Blocks.vue"), "utf8");

    expect(src).toContain("getPrimaryNodeLogo, loadCommittee");
    expect(src).toContain("VALIDATOR_IDENTITY_WAIT_MS");
    expect(src).toContain(".then(() => loadCommittee())");
    expect(src).toContain("await validatorIdentityPromise;");
  });

  it("uses the shared freshness query key for visible block pages", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Block/Blocks.vue"), "utf8");

    expect(src).toContain('import { createExplorerQueryKey, fetchFreshQuery } from "@/query/freshness"');
    expect(src).toContain('queryKeyFn: (limit, skip) => createExplorerQueryKey("blocks.list", { limit, skip })');
    expect(src).toContain('querySource: "blocks.list"');
    expect(src).toContain('createExplorerQueryKey("blocks.stats"');
  });
});
