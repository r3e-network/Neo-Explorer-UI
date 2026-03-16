import { tx } from "@cityofzion/neon-js";

export function extractScriptBase64FromUnsignedTx(unsignedTxHex) {
  const normalized = String(unsignedTxHex || "").trim();
  if (!normalized) return "";

  try {
    const transaction = tx.Transaction.deserialize(normalized);
    return transaction?.script?.toBase64?.() || "";
  } catch {
    return "";
  }
}

