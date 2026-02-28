const fs = require('fs');

let code = fs.readFileSync('src/services/neotubeService.js', 'utf8');

code = code.replace(/const normalizeFee = \(value\) => \{\n  const num = Number\(value\);\n  return Number\.isFinite\(num\) \? num : 0;\n\};/, `const normalizeFee = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  // NeoTube returns fees in raw GAS (e.g. 0.055). We need to convert it to fixed8 fractions for the rest of the app to process correctly.
  return Math.round(num * 100000000);
};`);

fs.writeFileSync('src/services/neotubeService.js', code);
