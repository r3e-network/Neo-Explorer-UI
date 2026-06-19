import { describe, expect, it } from "vitest";

describe("Transactions page source guards", () => {
  it("uses the shared freshness query key for visible transaction pages", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Transaction/Transactions.vue"), "utf8");

    expect(src).toContain('import { createExplorerQueryKey } from "@/query/freshness"');
    expect(src).toContain('queryKeyFn: (limit, skip) => createExplorerQueryKey("transactions.list", { limit, skip })');
    expect(src).toContain('querySource: "transactions.list"');
  });
});
