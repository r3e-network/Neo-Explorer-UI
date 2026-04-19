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

// Resolve once at module init — works in both Vite dev and Rollup production.
// - Rollup: default import = full CJS module (has tx, sc, rpc, wallet)
// - Vite dev: namespace import has the API spread on root
// - Node ESM: default import = full CJS module
const resolved = neonJsDefault?.tx?.Transaction
  ? neonJsDefault
  : neonJsNamespace?.tx?.Transaction
    ? neonJsNamespace
    : null;

export async function loadNeonJs() {
  if (resolved) return resolved;
  if (typeof window !== "undefined" && window.Neon?.tx?.Transaction) return window.Neon;
  return null;
}

export function getNeonJsSync() {
  if (resolved) return resolved;
  if (typeof window !== "undefined" && window.Neon?.tx?.Transaction) return window.Neon;
  return null;
}
