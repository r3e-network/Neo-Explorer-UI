const fs = require('fs');

let gov = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');

// I injected </div> when replacing the form but didn't match the closing properly. Let's fix the HTML structure.
const badFormTarget = `           <div>
             <label class="block text-sm font-medium text-high mb-1">Proposal Motivation</label>
             <textarea class="form-input w-full h-24" placeholder="Explain why the council should sign this proposal..."></textarea>
           </div>
        </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Method Name</label>
             <input type="text" class="form-input w-full" placeholder="e.g. transfer" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Signatures Required (Threshold)</label>
             <input type="number" class="form-input w-full" value="2" min="1" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Description / Proposal details</label>
             <textarea class="form-input w-full h-24" placeholder="Explain the purpose of this request..."></textarea>
           </div>
        </div>`;

const goodFormTarget = `           <div>
             <label class="block text-sm font-medium text-high mb-1">Proposal Motivation</label>
             <textarea class="form-input w-full h-24" placeholder="Explain why the council should sign this proposal..."></textarea>
           </div>
        </div>`;
        
gov = gov.replace(badFormTarget, goodFormTarget);
fs.writeFileSync('src/views/Tools/GovernanceTool.vue', gov);


let multi = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');
const badFormMulti = `           <div>
             <label class="block text-sm font-medium text-high mb-1">Description</label>
             <textarea class="form-input w-full h-24" placeholder="Explain the purpose of this transaction..."></textarea>
           </div>
        </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Method Name</label>
             <input type="text" class="form-input w-full" placeholder="e.g. transfer" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Signatures Required (Threshold)</label>
             <input type="number" class="form-input w-full" value="2" min="1" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Description / Proposal details</label>
             <textarea class="form-input w-full h-24" placeholder="Explain the purpose of this request..."></textarea>
           </div>
        </div>`;
const goodFormMulti = `           <div>
             <label class="block text-sm font-medium text-high mb-1">Description</label>
             <textarea class="form-input w-full h-24" placeholder="Explain the purpose of this transaction..."></textarea>
           </div>
        </div>`;
multi = multi.replace(badFormMulti, goodFormMulti);
fs.writeFileSync('src/views/Tools/MultiSigTool.vue', multi);

