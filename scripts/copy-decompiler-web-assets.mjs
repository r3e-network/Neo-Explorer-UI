#!/usr/bin/env node
import { cp, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(rootDir, "node_modules", "neo-decompiler-web", "dist", "pkg");
const targetDir = path.join(rootDir, "dist", "assets", "pkg");
const packageJsonPath = path.join(rootDir, "node_modules", "neo-decompiler-web", "package.json");

try {
  await stat(sourceDir);
} catch (error) {
  throw new Error(`neo-decompiler-web wasm assets are missing: ${sourceDir}`, { cause: error });
}

await mkdir(path.dirname(targetDir), { recursive: true });
await cp(sourceDir, targetDir, { recursive: true, force: true });
const { version } = JSON.parse(await readFile(packageJsonPath, "utf8"));
for (const [sourceName, versionedName] of [
  ["neo_decompiler.js", `neo_decompiler-${version}.js`],
  ["neo_decompiler_bg.wasm", `neo_decompiler_bg-${version}.wasm`],
]) {
  await cp(path.join(sourceDir, sourceName), path.join(targetDir, versionedName), { force: true });
}
console.log(`Copied neo-decompiler-web ${version} assets -> ${path.relative(rootDir, targetDir)}`);
