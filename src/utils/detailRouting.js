/**
 * Detail page routing helpers: tab definitions and source code navigation.
 */

export function normalizeUpdateCounter(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function buildSourceCodeLocation(contractHash, updatecounter = 0) {
  return {
    path: "/source-code",
    query: {
      contractHash: contractHash || "",
      updatecounter: String(normalizeUpdateCounter(updatecounter)),
    },
  };
}

// Tabs return i18n keys via `labelKey`. Callers should map to translated
// labels using their own `t()` (typically inside a computed so the labels
// reactively re-render on locale change).
export function getContractDetailTabs() {
  return Object.freeze([
    Object.freeze({ key: "transactions", labelKey: "contractDetail.tabTransactions" }),
    Object.freeze({ key: "events", labelKey: "contractDetail.tabEvents" }),
    Object.freeze({ key: "readContract", labelKey: "contractDetail.tabReadContract" }),
    Object.freeze({ key: "writeContract", labelKey: "contractDetail.tabWriteContract" }),
    Object.freeze({ key: "code", labelKey: "contractDetail.tabCode" }),
  ]);
}

export function getTokenDetailTabs() {
  return Object.freeze([
    Object.freeze({ key: "transfers", labelKey: "tokenDetail.tabTransfers" }),
    Object.freeze({ key: "holders", labelKey: "tokenDetail.holdersHeader" }),
  ]);
}
