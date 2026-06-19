import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readView(relativePath) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("API docs responsive navigation", () => {
  it("uses compact category chips on mobile while preserving the desktop side rail", () => {
    const source = readView("src/views/Developer/ApiDocs.vue");

    expect(source).toContain('data-testid="api-docs-mobile-category-nav"');
    expect(source).toContain("lg:hidden");
    expect(source).toContain('class="etherscan-card hidden p-4 lg:block"');
    expect(source).toContain("categoryCountLabel");
    expect(source).toContain("getCategoryLabel(category)");
    expect(source).toContain("break-all font-mono");
  });
});
