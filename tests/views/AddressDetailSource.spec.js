// @vitest-environment node

import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("AddressDetail source guards", () => {
  it("only probes contract metadata for Hash160 route params, not normal account addresses", () => {
    const source = fs.readFileSync(new URL("../../src/views/Account/AddressDetail.vue", import.meta.url), "utf8");

    expect(source).toContain('import { isHash160Hex } from "@/utils/walletNormalization"');
    expect(source).toContain("if (isHash160Hex(addr))");
    expect(source).toContain("contractService.getByHashWithFallback(addr, { network: requestNetwork })");
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
    expect(source).toContain('import("./components/AddressRadarTab.vue")');
    expect(source).toContain("activeTab === 'assetRadar'");
    expect(source).toContain(":fetch-transfers=\"fetchRadarTransfersForAddress\"");
  });

  it("routes address summary, holdings, and default transactions through shared freshness keys", () => {
    const source = fs.readFileSync(new URL("../../src/views/Account/AddressDetail.vue", import.meta.url), "utf8");

    expect(source).toContain('import { createExplorerQueryKey, fetchFreshQuery } from "@/query/freshness"');
    expect(source).toContain('createExplorerQueryKey("address.transactions"');
    expect(source).toContain("network: context.network");
    expect(source).toContain('createExplorerQueryKey("address.summary", { address: addr, network: requestNetwork })');
    expect(source).toContain('createExplorerQueryKey("address.assets", { address: addr, network: requestNetwork })');
  });

  it("displays token holdings from loaded assets even if a stale summary reports zero", () => {
    const source = fs.readFileSync(new URL("../../src/views/Account/AddressDetail.vue", import.meta.url), "utf8");

    expect(source).toContain("const effectiveTokenCount = computed(");
    expect(source).toContain(":token-count=\"effectiveTokenCount\"");
    expect(source).toContain("assets.value.length");
  });

  it("does not keep NEO/GAS balance cards loading after asset balances arrive", () => {
    const source = fs.readFileSync(new URL("../../src/views/Account/AddressDetail.vue", import.meta.url), "utf8");

    expect(source).toContain("const balanceCardsLoading = computed(");
    expect(source).toContain(":summary-loading=\"balanceCardsLoading\"");
    expect(source).toContain("assets.value.length > 0");
  });

  it("seeds blockhash from the block height so the Block column links (#10fe)", () => {
    const source = fs.readFileSync(new URL("../../src/views/Account/AddressDetail.vue", import.meta.url), "utf8");

    // The fetcher must derive a linkable blockhash from block height when a
    // real hash is absent (account-tx rows carry block_index, not blockhash).
    expect(source).toMatch(/blockhash:\s*String\(tx\.blockIndex\)/);
    expect(source).toContain("tx.blockIndex != null");
  });

  it("reads the indexer paging.total for the transaction header, not a synthetic count (#13fe)", () => {
    const txSource = fs.readFileSync(
      new URL("../../src/services/transactionService.js", import.meta.url),
      "utf8",
    );

    // getByAddress must prefer paging.total (and pass script/vm_state through).
    expect(txSource).toContain("indexerRes.paging.total");
    expect(txSource).toContain("is_capped");
    expect(txSource).toMatch(/script:\s*row\.script/);
    expect(txSource).toMatch(/vm_state:\s*row\.vm_state/);
  });
});
