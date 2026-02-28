const fs = require('fs');

let gov = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');

// Make it non-transparent and clear major content
gov = gov.replace('class="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-line-soft overflow-hidden"', 'class="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-line-soft overflow-hidden relative z-10"');
gov = gov.replace('class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"', 'class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"');

// Allow naming and descriptions
const newGovForm = `<div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
           <div>
             <label class="block text-sm font-medium text-high mb-1">Proposal Name</label>
             <input type="text" class="form-input w-full" placeholder="e.g. Decrease GAS Network Fee" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Proposal Type</label>
             <select class="form-input w-full bg-surface">
               <option value="policy">Update Network Policy (Fee, Gas, etc.)</option>
               <option value="committee">Update Committee Members</option>
               <option value="designate">Designate Oracle / Role</option>
               <option value="other">Other Native Contract Invocation</option>
             </select>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Target Native Contract</label>
             <select v-model="selectedContract" class="form-input w-full bg-surface">
               <option value="PolicyContract">Policy Contract</option>
               <option value="RoleManagement">Role Management</option>
               <option value="OracleContract">Oracle Contract</option>
               <option value="NEO">NEO Token (Governance)</option>
             </select>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Method to Invoke</label>
             <select v-model="selectedMethod" class="form-input w-full bg-surface">
               <option v-for="m in availableMethods" :key="m.name" :value="m.name">{{ m.name }}</option>
             </select>
           </div>
           <div v-for="(param, idx) in methodParams" :key="idx">
             <label class="block text-sm font-medium text-high mb-1">{{ param.name }} ({{ param.type }})</label>
             <input type="text" class="form-input w-full" :placeholder="\`Enter \${param.type} value\`" />
           </div>
           <div class="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
             <p class="font-semibold mb-1">Note for Council Proposals:</p>
             <p>Signers are strictly limited to the current active Neo consensus nodes. Threshold is automatically determined (typically 2/3 + 1 of the committee).</p>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Proposal Motivation</label>
             <textarea class="form-input w-full h-24" placeholder="Explain why the council should sign this proposal..."></textarea>
           </div>
        </div>`;
        
gov = gov.replace(/<div class="p-6 space-y-4">[\s\S]*?<\/div>\n        <div class="px-6 py-4 border-t/, newGovForm + '\n        <div class="px-6 py-4 border-t');
fs.writeFileSync('src/views/Tools/GovernanceTool.vue', gov);


let multi = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');

multi = multi.replace('class="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-line-soft overflow-hidden"', 'class="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-line-soft overflow-hidden relative z-10"');
multi = multi.replace('class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"', 'class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"');

const newMultiForm = `<div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
           <div>
             <label class="block text-sm font-medium text-high mb-1">Request Name</label>
             <input type="text" class="form-input w-full" placeholder="e.g. Monthly Payroll" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Target Contract Hash / Recipient Address</label>
             <input type="text" class="form-input w-full" placeholder="N..." list="fast-contracts" />
             <datalist id="fast-contracts">
                <option value="0xf0151f528127558851b39c2cd8aa47da7418ab28">Flamingo (FLM)</option>
                <option value="0x48c40d4666f93408be1bef038b6722404d9a4c2a">NeoBurger (bNEO)</option>
                <option value="0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5">NEO Token</option>
                <option value="0xd2a4cff31913016155e38e474a2c06d08be276cf">GAS Token</option>
                <option value="NP2fM6AAN3mS6qA3oFk3TWeCgDMMmHrtfT">Binance Hot Wallet 1</option>
             </datalist>
             <p class="text-[10px] text-mid mt-1 px-1">Tip: Type to enter a custom address or select a known contract</p>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Operation / Method</label>
             <input type="text" class="form-input w-full" placeholder="e.g. transfer" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Multi-Sig Co-Signers (comma separated)</label>
             <input type="text" class="form-input w-full" placeholder="N..., N..., N..." />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Signatures Required (Threshold)</label>
             <input type="number" class="form-input w-full" value="2" min="1" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Description</label>
             <textarea class="form-input w-full h-24" placeholder="Explain the purpose of this transaction..."></textarea>
           </div>
        </div>`;
        
multi = multi.replace(/<div class="p-6 space-y-4">[\s\S]*?<\/div>\n        <div class="px-6 py-4 border-t/, newMultiForm + '\n        <div class="px-6 py-4 border-t');

// In multisig, we also want to explicitly show "target signers" and check connected wallet status on the item level.
// Let's add target signers view logic into the card.
const oldItem = `            <div class="text-right">
              <div class="text-sm font-semibold text-high mb-1">Signatures</div>
              <div class="flex items-center gap-2">
                <div class="text-2xl font-bold text-primary-600">{{ req.signatures?.length || 0 }}</div>
                <div class="text-sm text-mid">/ {{ req.signers_required }}</div>
              </div>
            </div>
          </div>
        </div>`;

const newItem = `            <div class="text-right">
              <div class="text-sm font-semibold text-high mb-1">Signatures</div>
              <div class="flex items-center gap-2 justify-end">
                <div class="text-2xl font-bold text-primary-600">{{ req.signatures?.length || 0 }}</div>
                <div class="text-sm text-mid">/ {{ req.signers_required }}</div>
              </div>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-line-soft">
            <div class="text-xs font-semibold text-high mb-2">Target Signers</div>
            <div class="flex flex-wrap gap-2">
               <span v-for="signer in (req.eligible_signers || [])" :key="signer" class="inline-flex items-center px-2 py-1 rounded bg-surface-muted border border-line-soft text-xs font-mono text-mid">
                 {{ connectedAccount?.address === signer ? 'You (Pending)' : signer }}
               </span>
            </div>
            <div v-if="connectedAccount && req.eligible_signers?.includes(connectedAccount.address)" class="mt-4">
              <button class="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors">
                 Sign Transaction
              </button>
            </div>
          </div>
        </div>`;

multi = multi.replace(oldItem, newItem);

fs.writeFileSync('src/views/Tools/MultiSigTool.vue', multi);
