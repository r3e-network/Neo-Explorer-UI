import { sha256 } from "ethereum-cryptography/sha256";
import { base64ToBytes, hexToBytes, strip0x } from "@/utils/neoHelpers";

const textEncoder = new TextEncoder();
const MAX_COMPILER_BYTES = 64;
const WEB_FALLBACK_WARNING = "neo-decompiler-web was unavailable; fell back to neo-decompiler-js.";

let webDecompilerClientPromise = null;

function writeVarInt(out, value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("invalid NEF varint");
  if (n < 0xfd) {
    out.push(n);
    return;
  }
  if (n <= 0xffff) {
    out.push(0xfd, n & 0xff, (n >> 8) & 0xff);
    return;
  }
  out.push(0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff);
}

function writeVarBytes(out, bytes) {
  writeVarInt(out, bytes.length);
  out.push(...bytes);
}

function writeVarString(out, value) {
  writeVarBytes(out, textEncoder.encode(String(value || "")));
}

function writeU16LE(out, value) {
  const n = Number(value) || 0;
  out.push(n & 0xff, (n >> 8) & 0xff);
}

function doubleSha256First4(bytes) {
  return sha256(sha256(new Uint8Array(bytes))).slice(0, 4);
}

function decodeHashBytes(value) {
  if (value instanceof Uint8Array) return value.length === 20 ? value : new Uint8Array(20);
  if (Array.isArray(value)) return Uint8Array.from(value).slice(0, 20);
  const text = String(value || "").trim();
  if (!text) return new Uint8Array(20);
  const hex = strip0x(text);
  if (/^[0-9a-fA-F]{40}$/.test(hex)) return hexToBytes(hex);
  const base64 = base64ToBytes(text);
  return base64.length === 20 ? base64 : new Uint8Array(20);
}

function decodeBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value);
  const text = String(value || "").trim();
  if (!text) return new Uint8Array();
  const hex = strip0x(text);
  if (hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex)) return hexToBytes(hex);
  return base64ToBytes(text);
}

function normalizeTokens(tokens) {
  return Array.isArray(tokens) ? tokens : [];
}

export function buildNefBytesFromChainState(nef = {}) {
  const scriptBytes = decodeBytes(nef.script);
  if (!scriptBytes.length) return new Uint8Array();

  const out = [];
  out.push(...textEncoder.encode("NEF3"));

  const compilerBytes = new Uint8Array(MAX_COMPILER_BYTES);
  compilerBytes.set(textEncoder.encode(String(nef.compiler || "neo-explorer")).slice(0, MAX_COMPILER_BYTES));
  out.push(...compilerBytes);

  writeVarString(out, nef.source || "");
  out.push(0x00);

  const tokens = normalizeTokens(nef.tokens);
  writeVarInt(out, tokens.length);
  for (const token of tokens) {
    out.push(...decodeHashBytes(token.hash || token.contract));
    writeVarString(out, token.method || "");
    writeU16LE(out, token.parametersCount ?? token.parameterscount ?? token.paramCount ?? token.params ?? 0);
    out.push(token.hasReturnValue ?? token.hasreturnvalue ?? token.hasReturn ? 1 : 0);
    out.push(Number(token.callFlags ?? token.callflags ?? 0x0f) & 0xff);
  }

  out.push(0x00, 0x00);
  writeVarBytes(out, scriptBytes);
  out.push(...doubleSha256First4(out));

  return new Uint8Array(out);
}

function extractNefBytes(contractState = {}) {
  const nef = contractState?.nef;
  if (!nef) return new Uint8Array();
  if (typeof nef === "string" || nef instanceof Uint8Array || Array.isArray(nef) || nef instanceof ArrayBuffer) {
    return decodeBytes(nef);
  }
  return buildNefBytesFromChainState(nef);
}

async function loadWebDecompilerClient() {
  if (!webDecompilerClientPromise) {
    webDecompilerClientPromise = import("neo-decompiler-web").then(async (decompiler) => {
      const client = await decompiler.init();
      client.initPanicHook?.();
      return client;
    });
  }
  return webDecompilerClientPromise;
}

async function decompileWithWebPackage(nefBytes, manifest = null) {
  const client = await loadWebDecompilerClient();
  const result = client.decompileReport(nefBytes, {
    manifestJson: manifest ? JSON.stringify(manifest) : undefined,
    strictManifest: false,
    failOnUnknownOpcodes: false,
    inlineSingleUseTemps: true,
    typedDeclarations: true,
    outputFormat: "csharp",
  });

  return {
    code: result.csharp || result.high_level || result.pseudocode || "",
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
  };
}

async function decompileWithJsPackage(nefBytes, manifest = null, leadingWarnings = []) {
  const decompiler = await import("neo-decompiler-js");
  const options = { clean: true };
  const result = manifest
    ? decompiler.decompileHighLevelBytesWithManifest(nefBytes, manifest, options)
    : decompiler.decompileHighLevelBytes(nefBytes, options);

  return {
    code: result.highLevel || result.groupedPseudocode || result.pseudocode || "",
    warnings: [...leadingWarnings, ...(Array.isArray(result.warnings) ? result.warnings : [])],
  };
}

export async function decompileContractState(contractState = {}, manifest = null) {
  const nefBytes = extractNefBytes(contractState);
  if (!nefBytes.length) {
    return { code: "", warnings: ["Contract NEF is unavailable."] };
  }

  try {
    return await decompileWithWebPackage(nefBytes, manifest);
  } catch {
    webDecompilerClientPromise = null;
    return decompileWithJsPackage(nefBytes, manifest, [WEB_FALLBACK_WARNING]);
  }
}
