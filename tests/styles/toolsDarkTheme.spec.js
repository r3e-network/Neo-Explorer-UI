import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/styles/tailwind.css"), "utf8");

describe("tools dark theme tokens", () => {
  it("defines a dedicated dark tool-page shell treatment", () => {
    expect(source).toContain(".dark .tool-page");
    expect(source).toContain(".dark .tool-page::before");
  });

  it("uses more solid dark surfaces and softer lines for cards", () => {
    expect(source).toContain("--surface-elevated: rgba(14, 20, 31, 0.88);");
    expect(source).toContain("--surface-glass: rgba(12, 18, 29, 0.72);");
    expect(source).toContain("--line-soft: rgba(120, 146, 177, 0.16);");
  });

  it("adds dark-specific card and panel polish for the shared tool surface", () => {
    expect(source).toContain(".dark .etherscan-card");
    expect(source).toContain(".dark .panel-muted");
    expect(source).toContain(".dark .page-header-icon");
  });
});
