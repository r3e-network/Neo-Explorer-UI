const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/ContractFactoryTool.vue', 'utf8');

const targetHtml = `<h2 class="text-lg font-bold text-high mb-6 border-b border-line-soft pb-4">
              Configure {{ activeTemplate.name }}
            </h2>`;

const newHtml = `<h2 class="text-lg font-bold text-high mb-4">
              Configure {{ activeTemplate.name }}
            </h2>
            
            <div class="mb-6 p-3 rounded-lg bg-blue-50/80 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 text-sm flex gap-3">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <strong>Demonstration Mode:</strong> Because dynamic smart contract compilation requires a dedicated backend compiler, this tool currently simulates a factory deployment. Submitting will record your configuration payload immutably to the blockchain via a 0 GAS self-transfer remark.
              </div>
            </div>`;

code = code.replace(targetHtml, newHtml);
fs.writeFileSync('src/views/Tools/ContractFactoryTool.vue', code);
