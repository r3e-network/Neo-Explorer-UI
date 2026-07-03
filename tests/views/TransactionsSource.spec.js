import { describe, expect, it } from "vitest";

describe("Transactions page source guards", () => {
  it("uses the shared freshness query key for visible transaction pages", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Transaction/Transactions.vue"), "utf8");

    expect(src).toContain('import { createExplorerQueryKey } from "@/query/freshness"');
    expect(src).toContain('createExplorerQueryKey("transactions.list", { limit, skip, network: context.network })');
    expect(src).toContain('querySource: "transactions.list"');
  });

  it("caps paged browsing at the read-api offset window and surfaces the notice", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/views/Transaction/Transactions.vue"), "utf8");

    // Pager is bounded by the server offset clamp so infinite scroll / page
    // navigation cannot walk into the zone of repeating clamped rows.
    expect(src).toContain('import { MAX_TRANSACTION_LIST_OFFSET } from "@/constants"');
    expect(src).toContain("maxOffset: MAX_TRANSACTION_LIST_OFFSET");
    expect(src).toContain("offsetCapped");
    // And the user is told to use search for older history when the cap bites.
    expect(src).toContain("transactionsPage.offsetCapNotice");
  });
});
