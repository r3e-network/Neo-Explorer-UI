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

export function getContractDetailTabs() {
  return Object.freeze([
    Object.freeze({ key: "transactions", label: "Transactions" }),
    Object.freeze({ key: "events", label: "Events" }),
    Object.freeze({ key: "readContract", label: "Read Contract" }),
    Object.freeze({ key: "writeContract", label: "Write Contract" }),
    Object.freeze({ key: "code", label: "Code" }),
  ]);
}

export function getTokenDetailTabs() {
  return Object.freeze([
    Object.freeze({ key: "transfers", label: "Transfers" }),
    Object.freeze({ key: "holders", label: "Holders" }),
  ]);
}
