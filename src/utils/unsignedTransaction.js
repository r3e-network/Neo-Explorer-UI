import { tx } from "@cityofzion/neon-js";
import { bytesToBase64, hexToBytes, scriptHashToAddress } from "@/utils/neoHelpers";

function normalizeHex(value = "") {
  return String(value || "").trim().replace(/^0x/i, "");
}

function sumFixed8Values(left = "0", right = "0") {
  try {
    return (BigInt(left || "0") + BigInt(right || "0")).toString();
  } catch {
    return "0";
  }
}

function getScopeLabels(scopeValue) {
  const numeric = Number(scopeValue || 0);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return ["None"];
  }

  if (numeric === tx.WitnessScope.Global) {
    return ["Global"];
  }

  return Object.entries(tx.WitnessScope)
    .filter(([, value]) => Number.isInteger(value) && value > 0 && value !== tx.WitnessScope.Global)
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

export function decodeUnsignedTransaction(unsignedTxHex) {
  const normalized = normalizeHex(unsignedTxHex);
  if (!normalized) return null;

  try {
    const transaction = tx.Transaction.deserialize(normalized);
    const rawHex = normalizeHex(transaction.serialize(false));
    const scriptHex = normalizeHex(transaction?.script?.toString?.() || "");
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
      hash: transaction.hash?.() || "",
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
      scriptBase64: scriptHex ? bytesToBase64(hexToBytes(scriptHex)) : "",
      scriptLength: scriptHex.length / 2,
      totalLength: rawHex.length / 2,
    };
  } catch {
    return null;
  }
}

export function extractScriptBase64FromUnsignedTx(unsignedTxHex) {
  return decodeUnsignedTransaction(unsignedTxHex)?.scriptBase64 || "";
}
