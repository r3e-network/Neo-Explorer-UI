const fs = require('fs');

let file = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');

file = file.replace(/Multi-Signature & Governance/g, 'Multi-Signature Wallet');
file = file.replace('Create proposals and collect signatures for multi-sig execution', 'Create co-owned transactions, coordinate signatures, and execute operations safely');

file = file.replace(/<div class="p-6 space-y-4">[\s\S]*?<\/div>/, `<div class="p-6 space-y-4">
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
        </div>`);
        
fs.writeFileSync('src/views/Tools/MultiSigTool.vue', file);

