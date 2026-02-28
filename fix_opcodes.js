const fs = require('fs');
const { sc } = require('@cityofzion/neon-js');

// We need to keep the operand sizes correct.
const getOperandSize = (opName) => {
  if (opName === 'PUSHINT8') return 1;
  if (opName === 'PUSHINT16') return 2;
  if (opName === 'PUSHINT32') return 4;
  if (opName === 'PUSHINT64') return 8;
  if (opName === 'PUSHINT128') return 16;
  if (opName === 'PUSHINT256') return 32;
  if (opName === 'PUSHA') return 4;
  if (opName === 'PUSHDATA1') return -1;
  if (opName === 'PUSHDATA2') return -1;
  if (opName === 'PUSHDATA4') return -1;
  
  if (['JMP', 'JMPIF', 'JMPIFNOT', 'JMPEQ', 'JMPNE', 'JMPGT', 'JMPGE', 'JMPLT', 'JMPLE', 'CALL', 'ENDTRY'].includes(opName)) return 1;
  if (['JMP_L', 'JMPIF_L', 'JMPIFNOT_L', 'JMPEQ_L', 'JMPNE_L', 'JMPGT_L', 'JMPGE_L', 'JMPLT_L', 'JMPLE_L', 'CALL_L', 'ENDTRY_L', 'SYSCALL'].includes(opName)) return 4;
  if (opName === 'CALLT') return 2;
  if (opName === 'TRY') return 2;
  if (opName === 'TRY_L') return 8;
  return 0; // Everything else has 0 immediate operand size
};

const getPrefixSize = (opName) => {
  if (opName === 'PUSHDATA1') return 1;
  if (opName === 'PUSHDATA2') return 2;
  if (opName === 'PUSHDATA4') return 4;
  return 0;
};

const generated = {};
for (const key in sc.OpCode) {
  const val = parseInt(key);
  if (!isNaN(val)) {
    const name = sc.OpCode[key];
    generated[val] = {
       name,
       operandSize: getOperandSize(name),
       prefix: getPrefixSize(name),
       desc: name
    };
  }
}

const content = `// Auto-generated Neo3 Opcodes
export const OPCODES = ${JSON.stringify(generated, null, 2)};
`;

fs.writeFileSync('src/utils/neoOpcodes.js', content);
