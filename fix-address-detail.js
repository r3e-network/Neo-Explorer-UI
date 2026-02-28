const fs = require('fs');
let code = fs.readFileSync('src/utils/addressDetail.js', 'utf8');

if (!code.includes('import { NATIVE_CONTRACTS }')) {
  code = `import { NATIVE_CONTRACTS } from "@/constants";\nimport { KNOWN_CONTRACTS } from "@/constants/knownContracts";\n` + code;
}

code = code.replace(/tokenName: t\?\.tokenname \|\| t\?\.symbol \|\| t\?\.name \|\| "Unknown",/, 
  `tokenName: t?.tokenname || t?.symbol || t?.name || (t?.contract ? (NATIVE_CONTRACTS[(t.contract||"").toLowerCase()]?.symbol || KNOWN_CONTRACTS[(t.contract||"").toLowerCase()]?.symbol) : null) || (t?.assethash ? (NATIVE_CONTRACTS[(t.assethash||"").toLowerCase()]?.symbol || KNOWN_CONTRACTS[(t.assethash||"").toLowerCase()]?.symbol) : null) || "Unknown",`);

fs.writeFileSync('src/utils/addressDetail.js', code);
