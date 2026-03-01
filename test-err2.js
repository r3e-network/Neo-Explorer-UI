function isDapiConnectionDenied(err) {
  const type = String(err?.type || "").toUpperCase();
  const msg = typeof err === 'string' ? err : String(err?.description || err?.message || err?.error?.message || err?.data?.message || "").toLowerCase();
  
  console.log("type:", type, "msg:", msg);
  return type === "CONNECTION_DENIED" || type === "CANCELED" || /refused to process this request|connection denied|user canceled|canceled/.test(msg);
}

console.log(isDapiConnectionDenied({ type: "CANCELED", description: "User canceled" }));
