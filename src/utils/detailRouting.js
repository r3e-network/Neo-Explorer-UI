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
  return [
    { key: "transactions", label: "Transactions" },
    { key: "code", label: "Code" },
    { key: "events", label: "Events" },
    { key: "readContract", label: "Read Contract" },
    { key: "writeContract", label: "Write Contract" },
  ];
}

export function getTokenDetailTabs() {
  return [
    { key: "transfers", label: "Transfers" },
    { key: "holders", label: "Holders" },
  ];
}

export default {
  normalizeUpdateCounter,
  buildSourceCodeLocation,
  getContractDetailTabs,
  getTokenDetailTabs,
};
