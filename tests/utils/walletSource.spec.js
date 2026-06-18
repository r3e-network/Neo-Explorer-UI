import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/utils/wallet.js"), "utf8");
const chatSessionSource = fs.readFileSync(path.resolve(process.cwd(), "src/composables/useChatSession.js"), "utf8");
const appHeaderSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/layout/AppHeader.vue"), "utf8");
const contractDetailSource = fs.readFileSync(path.resolve(process.cwd(), "src/views/Contract/ContractDetail.vue"), "utf8");
const txDetailSource = fs.readFileSync(path.resolve(process.cwd(), "src/views/Transaction/TxDetail.vue"), "utf8");

describe("utils/wallet source", () => {
  it("uses the shared lazy wallet-service loader instead of inline dynamic imports", () => {
    expect(source).toContain('from "@/utils/lazyServices"');
    expect(chatSessionSource).toContain('from "@/utils/lazyServices"');
    expect(appHeaderSource).toContain('from "@/utils/lazyServices"');

    expect(source).not.toMatch(/import\(['"]@\/services\/walletService['"]\)/);
    expect(chatSessionSource).not.toMatch(/import\(['"]@\/services\/walletService['"]\)/);
    expect(appHeaderSource).not.toMatch(/import\(['"]@\/services\/walletService['"]\)/);
  });

  it("keeps contract detail read-only rendering off the heavy wallet-service path", () => {
    expect(contractDetailSource).toContain('from "@/utils/lazyServices"');
    expect(contractDetailSource).not.toMatch(/from ["']@\/services\/walletService["']/);
    expect(contractDetailSource).not.toMatch(/import\(["']@\/services\/walletService["']\)/);
  });

  it("lazy-loads non-default contract detail tabs", () => {
    expect(contractDetailSource).toContain("defineAsyncComponent");
    expect(contractDetailSource).toContain('import("@/views/Contract/EventsTable.vue")');
    expect(contractDetailSource).toContain('import("@/views/Contract/components/ContractCodeTab.vue")');
    expect(contractDetailSource).toContain('import("@/views/Contract/components/ContractReadTab.vue")');
    expect(contractDetailSource).toContain('import("@/views/Contract/components/ContractWriteTab.vue")');
  });

  it("keeps transaction detail default render off non-default tab chunks", () => {
    expect(txDetailSource).toContain("defineAsyncComponent");
    expect(txDetailSource).not.toMatch(/from ["']@\/services["']/);
    expect(txDetailSource).toContain('from "@/services/transactionService"');
    expect(txDetailSource).toContain('from "@/services/tokenService"');
    expect(txDetailSource).toContain('from "@/services/executionService"');
    expect(txDetailSource).toContain('from "@/services/blockService"');
    expect(txDetailSource).toContain('import("./components/TxScriptTab.vue")');
    expect(txDetailSource).toContain('import("./components/TxLogsTab.vue")');
    expect(txDetailSource).toContain('import("./components/TxTransfersTab.vue")');
    expect(txDetailSource).toContain('import("./components/TxExecutionTraceTab.vue")');
    expect(txDetailSource).toContain('import("@/components/trace/InternalOperations.vue")');
    expect(txDetailSource).toContain('import("@/components/trace/StateChangeSummary.vue")');
  });
});
