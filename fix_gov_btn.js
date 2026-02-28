const fs = require('fs');

let file = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');

const oldButton = `<button @click="showCreateModal = true" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        New Request
      </button>`;

const newButton = `<div class="flex items-center gap-3">
        <button 
          v-if="!connectedAccount" 
          @click="connectWallet" 
          class="inline-flex items-center gap-2 rounded-lg bg-surface-elevated border border-line-soft px-4 py-2 text-sm font-semibold text-high hover:border-primary-500 transition-colors"
        >
          Connect Wallet
        </button>
        <button 
          v-else-if="!isCouncilNode" 
          disabled
          class="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-low cursor-not-allowed"
          title="Only active council nodes can create proposals"
        >
          Not a Council Node
        </button>
        <button 
          v-else
          @click="showCreateModal = true" 
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          New Proposal
        </button>
      </div>`;

file = file.replace(oldButton, newButton);


const oldIsCouncil = `const isCouncilNode = computed(() => {
  if (!connectedAccount.value) return false;
  // Verify if current address matches a primary node (which is the council/validators set)
  // Our useCommittee hook loads validators. We check if connectedAccount.value.address matches any.
  // Actually, getPrimaryNodeAddress expects index 0-6. Let's check 0-20 (committee).
  // A quick way is just assuming anyone can 'create' the UI draft but only sign if valid.
  // Or we just strictly enforce it. We'll enforce it lightly on UI.
  return true; // We'll refine this next
});`;

const newIsCouncil = `const { isCouncilMember } = useCommittee();
const isCouncilNode = computed(() => {
  if (!connectedAccount.value || !connectedAccount.value.address) return false;
  return isCouncilMember(connectedAccount.value.address);
});`;

file = file.replace(oldIsCouncil, newIsCouncil);

fs.writeFileSync('src/views/Tools/GovernanceTool.vue', file);
