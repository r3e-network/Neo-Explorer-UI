import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/utils/wallet.js"), "utf8");
const chatSessionSource = fs.readFileSync(path.resolve(process.cwd(), "src/composables/useChatSession.js"), "utf8");
const appHeaderSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/layout/AppHeader.vue"), "utf8");

describe("utils/wallet source", () => {
  it("uses the shared lazy wallet-service loader instead of inline dynamic imports", () => {
    expect(source).toContain('from "@/utils/lazyServices"');
    expect(chatSessionSource).toContain('from "@/utils/lazyServices"');
    expect(appHeaderSource).toContain('from "@/utils/lazyServices"');

    expect(source).not.toMatch(/import\(['"]@\/services\/walletService['"]\)/);
    expect(chatSessionSource).not.toMatch(/import\(['"]@\/services\/walletService['"]\)/);
    expect(appHeaderSource).not.toMatch(/import\(['"]@\/services\/walletService['"]\)/);
  });
});
