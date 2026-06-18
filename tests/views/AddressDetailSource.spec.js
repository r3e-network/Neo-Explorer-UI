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

  it("keeps the default address transactions tab lean", () => {
    const source = fs.readFileSync(new URL("../../src/views/Account/AddressDetail.vue", import.meta.url), "utf8");

    expect(source).toContain("defineAsyncComponent");
    expect(source).not.toMatch(/from ["']@\/services["']/);
    expect(source).toContain('from "@/services/accountService"');
    expect(source).toContain('from "@/services/transactionService"');
    expect(source).toContain('from "@/services/contractService"');
    expect(source).toContain('from "@/services/candidateService"');
    expect(source).toContain('from "@/services/tokenService"');
    expect(source).toContain('import("./components/AddressTokenTransfersTab.vue")');
    expect(source).toContain('import("./components/AddressNftTransfersTab.vue")');
    expect(source).toContain('import("./components/AddressTokensTab.vue")');
    expect(source).toContain('import("./components/AddressNftsTab.vue")');
    expect(source).toContain('import("./components/AddressVotersTab.vue")');
  });
});
