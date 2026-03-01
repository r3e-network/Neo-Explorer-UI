function isDapiConnectionDenied(err) {
  const type = String(err?.type || "").toUpperCase();
  const msg = typeof err === "string" ? err.toLowerCase() : String(err?.description || err?.message || "").toLowerCase();
  
  console.log("type:", type, "msg:", msg);
  return type === "CONNECTION_DENIED" || /refused to process this request|connection denied/.test(msg);
}

console.log(isDapiConnectionDenied({ type: "CONNECTION_DENIED", description: "NeoLine refused this request." }));
console.log(isDapiConnectionDenied({ type: "RPC_ERROR", message: "CONNECTION DENIED" }));
console.log(isDapiConnectionDenied({ type: "CANCELED", description: "User canceled" }));
