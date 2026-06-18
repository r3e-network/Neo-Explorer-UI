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

function findNeonJs(...candidates) {
  for (const c of candidates) {
    if (c?.tx?.Transaction?.deserialize && c?.rpc?.RPCClient) return c;
  }
  for (const c of candidates) {
    if (c?.tx?.Transaction) return c;
  }
  return null;
}

let bundledNeonJs = null;
let bundledNeonJsPromise = null;

async function loadBundledNeonJs() {
  if (bundledNeonJs) return bundledNeonJs;
  if (!bundledNeonJsPromise) {
    bundledNeonJsPromise = import("@cityofzion/neon-js")
      .then((module) => {
        bundledNeonJs = findNeonJs(module?.default, module, module?.default?.default);
        return bundledNeonJs;
      })
      .catch(() => null);
  }
  return bundledNeonJsPromise;
}

export async function loadNeonJs() {
  if (typeof window !== "undefined") {
    const runtime = findNeonJs(window.Neon);
    if (runtime) return runtime;
  }
  return loadBundledNeonJs();
}

export function getNeonJsSync() {
  if (typeof window !== "undefined") {
    const runtime = findNeonJs(window.Neon);
    if (runtime) return runtime;
  }
  return bundledNeonJs;
}
