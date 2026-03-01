function getWalletErrorMessage(err) {
  if (!err) return "";
  if (typeof err === "string") return err;

  const candidates = [
    err.description,
    err.message,
    err.error?.description,
    err.error?.message,
    err.data?.description,
    err.data?.message,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

function isDapiConnectionDenied(err) {
  const type = String(err?.type || "").toUpperCase();
  const msg = getWalletErrorMessage(err).toLowerCase();
  return type === "CONNECTION_DENIED" || type === "CANCELED" || /refused to process this request|connection denied|user canceled|canceled/.test(msg);
}

const mockErr = { type: "CONNECTION_DENIED", description: "NeoLine refused to process this request" };
console.log(isDapiConnectionDenied(mockErr));
