const fs = require('fs');

let code = fs.readFileSync('src/utils/gasFormat.js', 'utf8');

code = code.replace(/export function formatGasDecimal\(value, decimals = 4\) \{\n  if \(!value\) return "0";\n  const num = Number\(value\);\n  if \(!Number\.isFinite\(num\)\) return "0";\n  return num\.toFixed\(decimals\);\n\}/, `export function formatGasDecimal(value, decimals = 4) {
  if (!value) return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return (num / GAS_DIVISOR).toFixed(decimals);
}`);

fs.writeFileSync('src/utils/gasFormat.js', code);
