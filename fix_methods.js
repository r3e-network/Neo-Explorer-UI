const fs = require('fs');

let file = fs.readFileSync('src/views/Tools/GovernanceTool.vue', 'utf8');

const selectBlocks = `
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
           </div>`;
           
file = file.replace(/<div>\s*<label class="block text-sm font-medium text-high mb-1">Target Native Contract[\s\S]*?<input type="text" class="form-input w-full" placeholder="JSON array or integer" \/>\s*<\/div>/, selectBlocks);


const scriptMethods = `const showCreateModal = ref(false);

const selectedContract = ref("PolicyContract");
const selectedMethod = ref("");

const NATIVE_METHODS = {
  PolicyContract: [
    { name: "setFeePerByte", params: [{ name: "value", type: "Integer" }] },
    { name: "setExecFeeFactor", params: [{ name: "value", type: "Integer" }] },
    { name: "setStoragePrice", params: [{ name: "value", type: "Integer" }] },
    { name: "blockAccount", params: [{ name: "account", type: "Hash160" }] },
    { name: "unblockAccount", params: [{ name: "account", type: "Hash160" }] }
  ],
  RoleManagement: [
    { name: "designateAsRole", params: [{ name: "role", type: "Integer" }, { name: "nodes", type: "Array" }] }
  ],
  OracleContract: [
    { name: "setPrice", params: [{ name: "price", type: "Integer" }] }
  ],
  NEO: [
    { name: "setGasPerBlock", params: [{ name: "gasPerBlock", type: "Integer" }] },
    { name: "setRegisterPrice", params: [{ name: "registerPrice", type: "Integer" }] }
  ]
};

const availableMethods = computed(() => {
  return NATIVE_METHODS[selectedContract.value] || [];
});

const methodParams = computed(() => {
  const methods = availableMethods.value;
  const method = methods.find(m => m.name === selectedMethod.value);
  return method ? method.params : [];
});

watch(selectedContract, () => {
  if (availableMethods.value.length > 0) {
    selectedMethod.value = availableMethods.value[0].name;
  }
}, { immediate: true });
`;

file = file.replace('const showCreateModal = ref(false);', scriptMethods);

fs.writeFileSync('src/views/Tools/GovernanceTool.vue', file);
