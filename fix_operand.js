const fs = require('fs');

let file = fs.readFileSync('src/utils/scriptDisassembler.js', 'utf8');

const oldFormat = `function formatOperand(opDef, operandBytes) {
  if (!operandBytes || operandBytes.length === 0) return "";

  const hex = bytesToHex(operandBytes);
  const name = opDef.name;`;

const newFormat = `function formatOperand(opDef, operandBytes) {
  if (!operandBytes || operandBytes.length === 0) return "";

  const hex = bytesToHex(operandBytes);
  const name = opDef.name;
  
  if (name.startsWith("PUSHINT")) {
     // Neo uses little endian for integers
     let val = 0n;
     for (let i = operandBytes.length - 1; i >= 0; i--) {
        val = (val * 256n) + BigInt(operandBytes[i]);
     }
     // very naive signed decoding for visual fallback, better to use proper BigInt decoding
     return val.toString();
  }
  
  if (name.startsWith("PUSHDATA")) {
     try {
         // attempt to read as string if printable ascii
         const str = new TextDecoder("utf-8", { fatal: true }).decode(operandBytes);
         if (/^[\\x20-\\x7E]*$/.test(str)) return \`"\${str}"\`;
     } catch(e) {}
  }`;
  
file = file.replace(oldFormat, newFormat);

fs.writeFileSync('src/utils/scriptDisassembler.js', file);
