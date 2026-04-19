/**
 * Unified neon-js loader that works in all environments:
 * - Vite dev: import() returns CJS-wrapped namespace with full API on root
 * - Rollup production: import() returns ESM namespace with mangled keys
 * - window.Neon: set globally by the app entry point
 *
 * Usage:
 *   import { loadNeonJs } from "@/utils/neonLoader";
 *   const neonJs = await loadNeonJs();
 *   const rpcClient = new neonJs.rpc.RPCClient(url);
 */

import neonJsDefault from "@cityofzion/neon-js";
import * as neonJsNamespace from "@cityofzion/neon-js";

function findNeonJs(...candidates) {
  for (const c of candidates) {
    if (c?.tx?.Transaction?.deserialize && c?.rpc?.RPCClient) return c;
  }
  for (const c of candidates) {
    if (c?.tx?.Transaction) return c;
  }
  return null;
}

// Resolve at module init. Check every possible location:
// 1. default import (works in Rollup production & Node ESM)
// 2. namespace import (works in Vite dev)
// 3. namespace.default (Vite dev wraps CJS with { ...mod, default: mod })
const resolved = findNeonJs(
  neonJsDefault,
  neonJsNamespace,
  neonJsNamespace?.default,
);

export async function loadNeonJs() {
  if (resolved) return resolved;
  if (typeof window !== "undefined") return findNeonJs(window.Neon);
  return null;
}

export function getNeonJsSync() {
  if (resolved) return resolved;
  if (typeof window !== "undefined") return findNeonJs(window.Neon);
  return null;
}
