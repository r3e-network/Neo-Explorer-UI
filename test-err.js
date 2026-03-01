function isDapiConnectionDenied(err) {
  const type = String(err?.type || "").toUpperCase();
  const msg = typeof err === "string" ? err.toLowerCase() : String(err?.description || err?.message || "").toLowerCase();
  return type === "CONNECTION_DENIED" || /refused to process this request|connection denied|canceled/.test(msg);
}
console.log(isDapiConnectionDenied({ type: "CANCELED", description: "User canceled" }));
