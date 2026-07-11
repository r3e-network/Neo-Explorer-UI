import { createNeoDecompilerClient } from "neo-decompiler-web";

export const NEO_DECOMPILER_WEB_VERSION = "0.11.0";

const MAX_INIT_ATTEMPTS = 2;
const RETRY_DELAY_MS = 200;
let clientPromise = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getNeoDecompilerAssetUrls(attempt = 0) {
  const query = new URLSearchParams({
    v: NEO_DECOMPILER_WEB_VERSION,
    attempt: String(attempt),
  }).toString();
  return {
    moduleUrl: `/assets/pkg/neo_decompiler-${NEO_DECOMPILER_WEB_VERSION}.js?${query}`,
    wasmUrl: `/assets/pkg/neo_decompiler_bg-${NEO_DECOMPILER_WEB_VERSION}.wasm?${query}`,
  };
}

async function importBindings(moduleUrl) {
  return import(/* @vite-ignore */ moduleUrl);
}

export async function createNeoDecompilerWebClient({
  importModule = importBindings,
  maxAttempts = MAX_INIT_ATTEMPTS,
  retryDelayMs = RETRY_DELAY_MS,
} = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < Math.max(1, maxAttempts); attempt += 1) {
    const { moduleUrl, wasmUrl } = getNeoDecompilerAssetUrls(attempt);
    try {
      const bindings = await importModule(moduleUrl);
      if (typeof bindings?.default !== "function") {
        throw new Error("neo-decompiler WebAssembly loader is invalid.");
      }
      await bindings.default({ module_or_path: wasmUrl });
      const client = createNeoDecompilerClient({
        infoReport: bindings.infoReport,
        disasmReport: bindings.disasmReport,
        decompileReport: bindings.decompileReport,
        initPanicHook: bindings.initPanicHook,
      });
      client.initPanicHook?.();
      return client;
    } catch (error) {
      lastError = error;
      if (attempt + 1 < maxAttempts && retryDelayMs > 0) {
        await delay(retryDelayMs);
      }
    }
  }
  throw lastError || new Error("neo-decompiler-web is unavailable.");
}

export async function loadNeoDecompilerClient() {
  if (!clientPromise) {
    clientPromise = createNeoDecompilerWebClient();
  }
  try {
    return await clientPromise;
  } catch (error) {
    clientPromise = null;
    throw error;
  }
}

export function resetNeoDecompilerClientForTests() {
  clientPromise = null;
}
