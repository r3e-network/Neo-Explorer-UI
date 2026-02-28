const fs = require('fs');

let code = fs.readFileSync('src/utils/scriptDisassembler.js', 'utf8');

code = code.replace(/if \(nativeMatch\) \{\n          contractRef = nativeMatch\[1\];\n        \} else \{\n          \/\/ Keep it short if it's just a hash\n          const hashMatch = contractRef\.match\(\/0x\[a-f0-9\]\{40\}\/i\);\n          if \(hashMatch\) \{\n            contractRef = \`\$\{hashMatch\[0\]\.slice\(0, 6\)\}\.\.\.\$\{hashMatch\[0\]\.slice\(-4\)\}\`;\n          \}\n        \}/, `if (nativeMatch) {
          contractRef = nativeMatch[1];
        } else {
          const hashMatch = contractRef.match(/0x[a-f0-9]{40}/i);
          if (hashMatch) {
             contractRef = hashMatch[0]; // keep full hash so HashLink can resolve it
          }
        }`);

fs.writeFileSync('src/utils/scriptDisassembler.js', code);

let viewerCode = fs.readFileSync('src/components/trace/ScriptViewer.vue', 'utf8');

viewerCode = viewerCode.replace(/<div v-if="inst\.semantic" class="mb-1 text-\[11px\] font-bold text-primary-600 dark:text-primary-400">\n                \/\/ Call: \{\{ inst\.semantic \}\}\n              <\/div>/, `<div v-if="inst.semantic" class="mb-1 text-[11px] font-bold text-primary-600 dark:text-primary-400 inline-flex items-center gap-1">
                // Call: 
                <HashLink v-if="inst.semantic.startsWith('0x')" :hash="inst.semantic.split('.')[0]" type="contract" :truncate="true" />
                <span v-else>{{ inst.semantic.split('.')[0] }}</span>
                <span>.{{ inst.semantic.split('.').slice(1).join('.') }}</span>
              </div>`);

fs.writeFileSync('src/components/trace/ScriptViewer.vue', viewerCode);

