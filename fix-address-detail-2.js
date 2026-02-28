const fs = require('fs');
let code = fs.readFileSync('src/utils/addressDetail.js', 'utf8');

code = code.replace(/export function normalizeNep17Transfers\(transfers = \[\]\) \{[\s\S]*?\}\)/, 
`export function normalizeNep17Transfers(transfers = []) {
  const list = Array.isArray(transfers) ? transfers : [];
  return list.map((t) => {
    const hash = String(t?.contract || t?.contractHash || t?.assethash || "").toLowerCase();
    let tokenName = t?.tokenname || t?.symbol || t?.name;
    if (!tokenName && hash) {
      const known = NATIVE_CONTRACTS[hash] || KNOWN_CONTRACTS[hash];
      if (known && known.symbol) {
        tokenName = known.symbol;
      }
    }
    
    return {
      txHash: t?.txid || t?.hash || t?.txHash || "",
      timestamp: t?.timestamp ?? t?.blocktime ?? t?.time ?? 0,
      from: scriptHashToAddress(t?.from || t?.fromAddress || t?.sender || ""),
      to: scriptHashToAddress(t?.to || t?.toAddress || t?.receiver || ""),
      amount: t?.value ?? t?.amount ?? t?.transferamount ?? "0",
      tokenName: tokenName || "Unknown",
      tokenHash: hash,
      decimals: toNumber(t?.decimals, hash === "0xd2a4cff31913016155e38e474a2c06d08be276cf" ? 8 : 0),
    };
  })`);

fs.writeFileSync('src/utils/addressDetail.js', code);
