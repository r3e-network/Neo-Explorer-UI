// @vitest-environment node

import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("AddressDetail source guards", () => {
  it("only probes contract metadata for Hash160 route params, not normal account addresses", () => {
    const source = fs.readFileSync(new URL("../../src/views/Account/AddressDetail.vue", import.meta.url), "utf8");

    expect(source).toContain('import { isHash160Hex } from "@/utils/walletNormalization"');
    expect(source).toContain("if (isHash160Hex(addr))");
    expect(source).toContain("contractService.getByHashWithFallback(addr)");
  });
});
