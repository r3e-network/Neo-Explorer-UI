const fs = require('fs');

let file = fs.readFileSync('src/utils/scriptDisassembler.js', 'utf8');

// I replaced things improperly before, so let's carefully replace the operand size extraction block.
const oldBlock = `    if (opDef.operandSize === -1) {
      // Variable-length: read prefix bytes for length
      const prefixSize = opDef.prefix || 1;
      if (pos + prefixSize > bytes.length) break;
      const dataLen = readUIntLE(bytes, pos, prefixSize);
      pos += prefixSize;
      if (pos + dataLen > bytes.length) break;
      operandBytes = bytes.slice(pos, pos + dataLen);
      rawHex += bytesToHex(bytes.slice(pos - prefixSize, pos + dataLen));
      pos += dataLen;
    } else if (opDef.operandSize > 0) {`;

const newBlock = `    if (opDef.operandSize === -1) {
      // Variable-length: read prefix bytes for length
      const prefixSize = opDef.prefix || 1;
      if (pos + prefixSize > bytes.length) break;
      const dataLen = readUIntLE(bytes, pos, prefixSize);
      rawHex += bytesToHex(bytes.slice(pos, pos + prefixSize));
      pos += prefixSize;
      if (pos + dataLen > bytes.length) break;
      operandBytes = bytes.slice(pos, pos + dataLen);
      rawHex += bytesToHex(operandBytes);
      pos += dataLen;
    } else if (opDef.operandSize > 0) {`;

file = file.replace(oldBlock, newBlock);
fs.writeFileSync('src/utils/scriptDisassembler.js', file);
