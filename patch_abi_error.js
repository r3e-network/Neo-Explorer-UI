const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/AbiEncoderTool.vue', 'utf8');

const targetFunc = `    const args = encodeForm.value.params.map(p => {
      let val = p.value;
      if (p.type === 'Hash160') {
         // Auto-convert standard address to Hash160 if needed
         if (val.startsWith('N')) {
            val = new wallet.Account(val).scriptHash;
         }
      }
      return sc.ContractParam.fromJson({ type: p.type, value: val });
    });`;

const newFunc = `    const args = encodeForm.value.params.map((p, index) => {
      try {
        let val = p.value;
        if (p.type === 'Hash160') {
           if (val.startsWith('N')) {
              val = new wallet.Account(val).scriptHash;
           } else if (val.startsWith('0x')) {
              val = val.replace(/^0x/, '');
           }
        } else if (p.type === 'ByteArray' || p.type === 'Hash256') {
           if (val.startsWith('0x')) val = val.replace(/^0x/, '');
        } else if (p.type === 'Integer') {
           val = val.toString();
        } else if (p.type === 'Boolean') {
           val = val === 'true' || val === '1';
        }
        return sc.ContractParam.fromJson({ type: p.type, value: val });
      } catch (err) {
        throw new Error(\`Invalid format for Parameter \${index + 1} (\${p.type})\`);
      }
    });`;

code = code.replace(targetFunc, newFunc);
fs.writeFileSync('src/views/Tools/AbiEncoderTool.vue', code);
