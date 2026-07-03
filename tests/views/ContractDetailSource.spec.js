// @vitest-environment node

import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("ContractDetail source guards", () => {
  it("renders the active tab panel directly so highlighted tabs cannot keep stale content", () => {
    const source = fs.readFileSync(new URL("../../src/views/Contract/ContractDetail.vue", import.meta.url), "utf8");

    expect(source).toContain(':key="activeTab"');
    expect(source).not.toContain('<Transition name="tab-fade" mode="out-in">');
  });
});
