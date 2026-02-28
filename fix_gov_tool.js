const fs = require('fs');

let file = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');

file = file.replace(/Multi-Signature Wallet/g, 'Council Governance');
file = file.replace('Create co-owned transactions, coordinate signatures, and execute operations safely', 'Create official committee proposals, adjust network variables, and gather validator signatures');

const svgOld = `<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`;
const svgNew = `<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`;
file = file.replace(svgOld, svgNew);
file = file.replace('bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400');

file = file.replace(/>New Request</g, '>New Proposal<');
file = file.replace(/Create Multi-Sig Request/g, 'Create Council Proposal');
file = file.replace(/No multi-sig requests found./g, 'No pending council proposals found.');

const modalOld = `<div class="p-6 space-y-4">
           <div>
             <label class="block text-sm font-medium text-high mb-1">Target Contract Hash / Recipient Address</label>
             <input type="text" class="form-input w-full" placeholder="N..." />
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

const modalNew = `<div class="p-6 space-y-4">
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
             <select class="form-input w-full bg-surface">
               <option value="PolicyContract">Policy Contract</option>
               <option value="RoleManagement">Role Management</option>
               <option value="OracleContract">Oracle Contract</option>
               <option value="NEO">NEO Token (Governance)</option>
             </select>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Method to Invoke</label>
             <input type="text" class="form-input w-full" placeholder="e.g. setFeePerByte" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">New Value / Parameter</label>
             <input type="text" class="form-input w-full" placeholder="JSON array or integer" />
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

file = file.replace(modalOld, modalNew);

fs.writeFileSync('src/views/Tools/GovernanceTool.vue', file);

