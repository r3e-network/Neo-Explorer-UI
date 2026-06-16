import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd());

const sourceRoots = ["src", "api"];
const sourceExtensions = new Set([".js", ".vue", ".mjs", ".cjs"]);

const legacyInvocationPattern =
  /\b(?:safeRpc|safeRpcList|rpc)\(\s*["']Get[A-Z][A-Za-z0-9]*["']|rpcMethod:\s*["']Get[A-Z][A-Za-z0-9]*["']/g;

function collectSourceFiles(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(child));
      continue;
    }
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(child);
    }
  }
  return files;
}

describe("Phase 2e legacy RPC retirement", () => {
  it("does not actively invoke PascalCase legacy Get* RPC handlers", () => {
    const offenders = [];

    for (const relativePath of sourceRoots.flatMap(collectSourceFiles)) {
      const absolutePath = path.join(repoRoot, relativePath);
      const source = fs.readFileSync(absolutePath, "utf8");
      for (const match of source.matchAll(legacyInvocationPattern)) {
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${relativePath}:${line}: ${match[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
