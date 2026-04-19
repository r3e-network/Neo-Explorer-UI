import { getNeonJsSync, loadNeonJs } from "@/utils/neonLoader";
import { scriptHashToAddress } from "@/utils/neoHelpers";

export const ensureNeonJs = loadNeonJs;

function getNeonJs() {
  return getNeonJsSync();
}

function hexToBytes(hex) {
  const h = String(hex || "").replace(/^0x/i, "");
  return Uint8Array.from((h.match(/../g) || []), (b) => parseInt(b, 16));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hex2base64(hex) {
  const bytes = hexToBytes(hex);
  if (typeof btoa === "function") {
    return btoa(String.fromCharCode(...bytes));
  }
  // Node.js fallback
  return Buffer.from(bytes).toString("base64");
}

function normalizeHex(value = "") {
  return String(value || "")
    .trim()
    .replace(/^0x/i, "");
}

function sumFixed8Values(left = "0", right = "0") {
  try {
    return (BigInt(left || "0") + BigInt(right || "0")).toString();
  } catch {
    return "0";
  }
}

function getScopeLabels(scopeValue) {
  const witnessScope = getNeonJs()?.tx?.WitnessScope || {};
  const numeric = Number(scopeValue || 0);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return ["None"];
  }

  if (Number.isInteger(witnessScope.Global) && numeric === witnessScope.Global) {
    return ["Global"];
  }

  return Object.entries(witnessScope)
    .filter(([, value]) => Number.isInteger(value) && value > 0 && value !== witnessScope.Global)
    .filter(([, value]) => (numeric & value) === value)
    .map(([label]) => label);
}

function normalizeSignerCollection(items = []) {
  return Array.isArray(items) ? items.map((item) => String(item?.toString?.() || item || "")).filter(Boolean) : [];
}

function normalizeAttributes(items = []) {
  return Array.isArray(items)
    ? items.map((item, index) => {
        const type =
          String(item?.type || item?.usage || item?.constructor?.name || `Attribute ${index + 1}`).trim() ||
          `Attribute ${index + 1}`;
        const payload = { ...item };
        return {
          index: index + 1,
          type,
          raw: JSON.stringify(payload),
        };
      })
    : [];
}

function normalizeTransactionHash(hash) {
  if (typeof hash === "string") {
    return normalizeHex(hash);
  }

  if (hash instanceof Uint8Array) {
    return bytesToHex(hash);
  }

  if (Array.isArray(hash)) {
    return bytesToHex(Uint8Array.from(hash));
  }

  return "";
}

export function decodeUnsignedTransaction(unsignedTxHex) {
  const normalized = normalizeHex(unsignedTxHex);
  if (!normalized) return null;

  try {
    const neonJs = getNeonJs();
    if (!neonJs?.tx?.Transaction?.deserialize) {
      console.warn("[decodeUnsignedTransaction] neon-js not available:", {
        hasNeonJs: !!neonJs,
        hasTx: !!neonJs?.tx,
        hasTransaction: !!neonJs?.tx?.Transaction,
        hasDeserialize: typeof neonJs?.tx?.Transaction?.deserialize,
        keys: neonJs ? Object.keys(neonJs).slice(0, 10) : [],
      });
      return null;
    }

    let transaction;
    let rawHex = normalized;
    let txHash = "";

    try {
      transaction = neonJs.tx.Transaction.deserialize(normalized);
      txHash = normalizeTransactionHash(typeof transaction.hash === "function" ? transaction.hash() : transaction.hash);
      rawHex = transaction.serialize(false);
    } catch {
      // Unsigned governance packets may not have witnesses — neon-js may fail.
      // Try appending an empty witness array (00) to make it deserializable.
      try {
        transaction = neonJs.tx.Transaction.deserialize(normalized + "00");
        txHash = normalizeTransactionHash(typeof transaction.hash === "function" ? transaction.hash() : transaction.hash);
        rawHex = transaction.serialize(false);
      } catch {
        return null;
      }
    }

    const scriptHex = normalizeHex(transaction.script?.toString?.() || "");
    const signers = Array.isArray(transaction.signers)
      ? transaction.signers.map((signer, index) => {
          const accountScriptHash = normalizeHex(signer?.account?.toString?.() || "");
          return {
            index: index + 1,
            accountScriptHash,
            address: scriptHashToAddress(accountScriptHash) || "",
            scopes: Number(signer?.scopes ?? 0),
            scopeLabels: getScopeLabels(signer?.scopes),
            allowedContracts: normalizeSignerCollection(signer?.allowedContracts),
            allowedGroups: normalizeSignerCollection(signer?.allowedGroups),
            rules: Array.isArray(signer?.rules) ? signer.rules : [],
          };
        })
      : [];
    const attributes = normalizeAttributes(transaction.attributes);
    const systemFee = String(transaction.systemFee ?? "0");
    const networkFee = String(transaction.networkFee ?? "0");

    return {
      rawHex,
      hash: txHash || "Unavailable",
      version: Number(transaction.version ?? 0),
      nonce: Number(transaction.nonce ?? 0),
      validUntilBlock: Number(transaction.validUntilBlock ?? 0),
      systemFee,
      networkFee,
      totalFee: sumFixed8Values(systemFee, networkFee),
      signers,
      signersCount: signers.length,
      attributes,
      attributesCount: attributes.length,
      scriptHex,
      scriptBase64: scriptHex ? hex2base64(scriptHex) : "",
      scriptLength: scriptHex.length / 2,
      totalLength: rawHex.length / 2,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to decode unsigned transaction:", error);
    }
    return null;
  }
}

export function extractScriptBase64FromUnsignedTx(unsignedTxHex) {
  return decodeUnsignedTransaction(unsignedTxHex)?.scriptBase64 || "";
}
