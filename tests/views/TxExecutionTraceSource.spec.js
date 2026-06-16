import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/views/Transaction/TxExecutionTrace.vue"), "utf8");

describe("TxExecutionTrace source", () => {
  it("keeps the transaction hash header shrinkable on mobile", () => {
    expect(source).toContain("tx-trace-page-header");
    expect(source).toContain("tx-trace-title-block");
    expect(source).toContain("tx-trace-hash-row");
  });
});
