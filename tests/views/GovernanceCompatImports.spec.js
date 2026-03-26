import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("governance compat sdk imports", () => {
  it("loads the browser compat build for tool pages that expect neon-style namespaces", () => {
    const files = [
      "src/views/Tools/GovernanceTool.vue",
      "src/views/Tools/MultiSigTool.vue",
      "src/views/Tools/GovernanceProposalDetail.vue",
      "src/views/Tools/components/GovernanceCreateModal.vue",
      "src/views/Tools/components/GovernanceSignModal.vue",
      "src/views/Tools/AbstractAccountTool.vue",
    ];

    files.forEach((file) => {
      const source = readSource(file);
      expect(source).toContain('@cityofzion/neon-js');
      expect(source).not.toContain('import("@r3e/neo-js-sdk/browser")');
    });
  });
});
