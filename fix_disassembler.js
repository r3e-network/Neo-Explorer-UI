const fs = require('fs');
let file = fs.readFileSync('src/utils/scriptDisassembler.js', 'utf8');
file = file.replace(/const dataLen = readUIntLE\(bytes, pos, prefixSize\);/, `const dataLen = readUIntLE(bytes, pos, prefixSize);\n      rawHex += bytesToHex(bytes.slice(pos, pos + prefixSize));`);
file = file.replace(/rawHex \+= bytesToHex\(bytes\.slice\(pos - prefixSize, pos \+ dataLen\)\);/, `rawHex += bytesToHex(operandBytes);`);

// the SYSCALL_HASHES import was from neoOpcodes which I just overwrote. Let's provide them in scriptDisassembler directly or not use them.
// "import { OPCODES, SYSCALL_HASHES } from "./neoOpcodes";"
// I overwrote neoOpcodes.js, losing SYSCALL_HASHES. Let's fix that.
