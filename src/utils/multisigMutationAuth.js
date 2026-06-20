function stableStringify(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function buildMultisigMutationMessage({
  requestId,
  network = "",
  status = "",
  broadcastTxHash = "",
  broadcastAt = "",
  metadata = null,
} = {}) {
  return [
    "Neo Explorer Multisig Mutation v1",
    `Request ID: ${Number(requestId) || 0}`,
    `Network: ${String(network || "").trim().toLowerCase()}`,
    `Status: ${String(status || "").trim()}`,
    `Broadcast TX: ${String(broadcastTxHash || "").trim().toLowerCase()}`,
    `Broadcast At: ${String(broadcastAt || "").trim()}`,
    `Metadata: ${stableStringify(metadata ?? null)}`,
  ].join("\n");
}

export { stableStringify };
