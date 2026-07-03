#!/usr/bin/env node
import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(rootDir, "node_modules", "neo-decompiler-web", "dist", "pkg");
const targetDir = path.join(rootDir, "dist", "assets", "pkg");

try {
  await stat(sourceDir);
} catch (error) {
  throw new Error(`neo-decompiler-web wasm assets are missing: ${sourceDir}`, { cause: error });
}

await mkdir(path.dirname(targetDir), { recursive: true });
await cp(sourceDir, targetDir, { recursive: true, force: true });
console.log(`Copied neo-decompiler-web assets -> ${path.relative(rootDir, targetDir)}`);
