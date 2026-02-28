const fs = require('fs');

let file = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');

// Also update the empty state "Create the first one" button to require wallet logic
const oldEmptyBtn = `<button @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>`;
const newEmptyBtn = `<button v-if="connectedAccount" @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>
        <button v-else @click="connectWallet" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Connect wallet to create</button>`;
file = file.replace(oldEmptyBtn, newEmptyBtn);

fs.writeFileSync('src/views/Tools/MultiSigTool.vue', file);

// Let's do the same for GovernanceTool empty state
let gov = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');
const oldGovEmptyBtn = `<button @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>`;
const newGovEmptyBtn = `<button v-if="!connectedAccount" @click="connectWallet" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Connect wallet to create</button>
        <span v-else-if="!isCouncilNode" class="text-mid mt-2 text-sm font-medium">Only council nodes can create proposals</span>
        <button v-else @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>`;
gov = gov.replace(oldGovEmptyBtn, newGovEmptyBtn);
fs.writeFileSync('src/views/Tools/GovernanceTool.vue', gov);

