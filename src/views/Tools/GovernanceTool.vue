<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Council Governance' }]" />

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
        </div>
        <div>
          <h1 class="page-title">Council Governance</h1>
          <p class="page-subtitle">Create official committee proposals, adjust network variables, and gather validator signatures</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
          v-if="!connectedAccount"
          disabled
          class="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-low cursor-not-allowed"
        >
          Connect in Header
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
      </div>
    </div>

    <div v-if="committeeMultiSig" class="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-400 font-medium">
      <div>Committee Multi-Sig Address: <span class="font-hash ml-2">{{ committeeMultiSig.address }}</span></div>
      <div class="mt-1 text-xs opacity-80">Threshold: {{ threshold }} / {{ committeeSize }} nodes</div>
    </div>

    <div class="etherscan-card p-6">
      <div v-if="loading" class="space-y-4">
        <Skeleton v-for="i in 3" :key="i" height="80px" />
      </div>
      <div v-else-if="requests.length === 0" class="text-center py-12 text-mid">
        <svg class="mx-auto h-12 w-12 text-low mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>No pending council proposals found.</p>
        <span v-if="!connectedAccount" class="mt-2 block text-sm font-medium text-mid">Connect wallet from the top bar to create</span>
        <span v-else-if="!isCouncilNode" class="text-mid mt-2 text-sm font-medium">Only council nodes can create proposals</span>
        <button v-else @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>
      </div>
      <div v-else class="space-y-4">
        <div v-for="req in requests" :key="req.id" class="border border-line-soft rounded-xl p-4 hover:border-primary-400 transition-colors">
          <div class="flex flex-wrap gap-4 items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-high">{{ req.method }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-semibold"
                      :class="req.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'">
                  {{ req.status }}
                </span>
              </div>
              <p class="text-sm text-mid mb-2">{{ req.description || "No description provided." }}</p>
              <div class="text-xs text-low font-hash flex flex-wrap items-center gap-3">
                <span title="Target Contract">Target: {{ req.target_contract }}</span>
                <span>•</span>
                <span title="Transaction Hash">Tx: {{ req.params?.hash ? req.params.hash.slice(0, 8) + '...' : 'N/A' }}</span>
                <span>•</span>
                <span>Created: {{ new Date(req.created_at).toLocaleDateString() }}</span>
              </div>
              <div class="mt-2 flex gap-2">
                 <button @click="viewDetails(req)" class="text-xs text-primary-500 hover:underline">View JSON / Details</button>
              </div>
            </div>
            
            <div class="text-right">
              <div class="text-sm font-semibold text-high mb-1">Signatures</div>
              <div class="flex items-center gap-2 justify-end mb-2">
                <div class="text-2xl font-bold text-primary-600">{{ req.signatures?.length || 0 }}</div>
                <div class="text-sm text-mid">/ {{ req.signers_required }}</div>
              </div>
              
              <div v-if="req.status === 'PENDING'">
                 <div v-if="(req.signatures?.length || 0) >= req.signers_required">
                    <button @click="handleBroadcast(req)" class="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">Broadcast Tx</button>
                 </div>
                 <div v-else-if="isCouncilNode && !hasSigned(req)">
                    <button @click="openSignModal(req)" class="px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors">Sign Proposal</button>
                 </div>
                 <div v-else-if="hasSigned(req)">
                    <span class="text-xs font-semibold text-emerald-500 flex items-center justify-end gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      Signed
                    </span>
                 </div>
              </div>
              <div v-if="req.status === 'EXECUTED' && req.tx_hash">
                 <a :href="'/tx/' + req.tx_hash" class="text-xs text-primary-500 hover:underline">View Tx</a>
              </div>
            </div>
          </div>
          
          <div v-if="req.signatures?.length > 0" class="mt-4 pt-3 border-t border-line-soft">
            <div class="text-xs font-semibold text-mid mb-2">Approved By:</div>
            <div class="flex flex-wrap gap-2">
               <span v-for="sig in req.signatures" :key="sig.id" class="inline-flex items-center px-2 py-1 rounded bg-surface-muted border border-line-soft text-xs font-mono text-low" :title="sig.signer_address">
                 {{ sig.signer_address === connectedAccount ? 'You' : sig.signer_address.slice(0, 4) + '...' + sig.signer_address.slice(-4) }}
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Sign Modal -->
    <div v-if="signModalReq" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div class="w-full max-w-lg rounded-2xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 class="text-lg font-bold text-high">Sign Proposal</h2>
          <button @click="signModalReq = null" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-4">
           <div class="p-3 bg-surface-muted rounded-lg border border-line-soft font-mono text-[10px] break-all text-low overflow-y-auto max-h-32">
             {{ signModalReq.params?.unsigned_tx }}
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Option 1: Auto Sign</label>
             <button @click="autoSignTx" :disabled="isSigning" class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
               {{ isSigning ? 'Waiting for wallet...' : 'Sign via connected wallet' }}
             </button>
             <p class="text-xs text-mid mt-1 text-center">Requires Web3Auth or compatible raw-sign wallet.</p>
           </div>
           
           <div class="relative py-2">
             <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-line-soft"></div></div>
             <div class="relative flex justify-center"><span class="px-2 bg-white dark:bg-slate-950 text-xs text-mid">OR</span></div>
           </div>

           <div>
             <label class="block text-sm font-medium text-high mb-1">Option 2: Manual Signature</label>
             <p class="text-xs text-mid mb-2">Use neo-cli to sign the transaction hex above, then paste the signature below.</p>
             <input v-model="manualSignature" type="text" class="form-input w-full font-mono text-sm" placeholder="Paste 64-byte signature hex here..." />
             <button @click="submitManualSignature" :disabled="!manualSignature || manualSignature.length < 128" class="mt-2 w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 text-high border border-line-soft rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
               Submit Manual Signature
             </button>
           </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div class="w-full max-w-lg rounded-2xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 class="text-lg font-bold text-high">Create Council Proposal</h2>
          <button @click="showCreateModal = false" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
           <div>
             <label class="block text-sm font-medium text-high mb-1">Proposal Name</label>
             <input v-model="createForm.description" type="text" class="form-input w-full" placeholder="e.g. Decrease GAS Network Fee" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Target Native Contract</label>
             <select v-model="createForm.selectedContract" class="form-input w-full bg-surface">
               <option v-for="(addr, name) in NATIVE_CONTRACTS" :key="name" :value="name">{{ name }}</option>
             </select>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Method to Invoke</label>
             <select v-model="createForm.selectedMethod" class="form-input w-full bg-surface">
               <option v-for="m in availableMethods" :key="m.name" :value="m.name">{{ m.name }}</option>
             </select>
           </div>
           <div v-for="(param, idx) in methodParams" :key="idx">
             <label class="block text-sm font-medium text-high mb-1">{{ param.name }} ({{ param.type }})</label>
             <input v-model="createForm.params[param.name]" type="text" class="form-input w-full" :placeholder="`Enter ${param.type} value`" />
           </div>
        </div>
        <div class="px-6 py-4 border-t border-line-soft bg-slate-50 flex justify-end gap-3 dark:bg-slate-900">
          <button @click="showCreateModal = false" class="px-4 py-2 text-sm font-medium text-mid hover:text-high transition-colors">Cancel</button>
          <button @click="handleCreateProposal" :disabled="isCreating" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors active:scale-95 disabled:opacity-50">
            {{ isCreating ? 'Creating...' : 'Create Proposal' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Details Modal -->
    <div v-if="detailsModalReq" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div class="w-full max-w-2xl rounded-2xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 class="text-lg font-bold text-high">Proposal Details</h2>
          <button @click="detailsModalReq = null" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 overflow-y-auto font-mono text-xs text-low whitespace-pre-wrap">
          {{ JSON.stringify(detailsModalReq, null, 2) }}
        </div>
      </div>
    </div>

    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import { supabaseService } from "@/services/supabaseService";
import { connectedAccount } from '@/utils/wallet';
import { walletService } from "@/services/walletService";
import { getRpcUrl, getCurrentEnv } from '@/utils/env';
import { useToast } from "vue-toastification";

const toast = useToast();
const loading = ref(true);
const requests = ref([]);
const showCreateModal = ref(false);

const committeePubkeys = ref([]);
const committeeMultiSig = ref(null);
const threshold = ref(0);
const committeeSize = ref(0);

let neonJs = null;

const isCouncilNode = computed(() => {
  if (!connectedAccount.value || !committeeMultiSig.value || !neonJs) return false;
  try {
    return committeePubkeys.value.some(pk => new neonJs.wallet.Account(pk).address === connectedAccount.value);
  } catch(e) {
    return false;
  }
});

const NATIVE_CONTRACTS = {
  PolicyContract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
  RoleManagement: "49cf4e5378ffcd4dec034fd98a174c5491e395e2",
  OracleContract: "fe924b7cfe89ddd271abaf7210a80a7e11178758",
  NEO: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"
};

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

const createForm = ref({
  description: '',
  selectedContract: 'PolicyContract',
  selectedMethod: '',
  params: {}
});

const isCreating = ref(false);

const availableMethods = computed(() => {
  return NATIVE_METHODS[createForm.value.selectedContract] || [];
});

const methodParams = computed(() => {
  const methods = availableMethods.value;
  const method = methods.find(m => m.name === createForm.value.selectedMethod);
  return method ? method.params : [];
});

watch(() => createForm.value.selectedContract, () => {
  if (availableMethods.value.length > 0) {
    createForm.value.selectedMethod = availableMethods.value[0].name;
    createForm.value.params = {};
  }
}, { immediate: true });

async function loadCommittee() {
  if (!neonJs) return;
  try {
    const rpcClient = new neonJs.rpc.RPCClient(getRpcUrl());
    const committee = await rpcClient.getCommittee();
    const sorted = [...committee].sort((a,b) => a.localeCompare(b));
    committeePubkeys.value = sorted;
    committeeSize.value = sorted.length;
    threshold.value = sorted.length - Math.floor((sorted.length - 1) / 3);
    committeeMultiSig.value = neonJs.wallet.Account.createMultiSig(threshold.value, sorted);
  } catch (e) {
    console.error("Failed to load committee:", e);
  }
}

async function loadRequests() {
  try {
    const data = await supabaseService.getMultisigRequests();
    // Only show governance proposals (could filter by type if added, or target_contract matching native ones)
    requests.value = data.filter(r => Object.values(NATIVE_CONTRACTS).includes(r.target_contract) || r.type === 'governance') || [];
  } catch (e) {
    console.error("Error loading requests", e);
  }
}

function hasSigned(req) {
  if (!connectedAccount.value || !req.signatures) return false;
  return req.signatures.some(s => s.signer_address === connectedAccount.value);
}

const signModalReq = ref(null);
const manualSignature = ref("");
const isSigning = ref(false);

const detailsModalReq = ref(null);
function viewDetails(req) {
  detailsModalReq.value = req;
}

function openSignModal(req) {
  signModalReq.value = req;
  manualSignature.value = "";
}

function normalizeArg(val, type) {
  if (!neonJs) return val;
  if (type === "Integer") return neonJs.sc.ContractParam.integer(val);
  if (type === "Hash160") {
    // If it's an address, convert to Hash160 hex
    if (val.startsWith("N") && val.length === 34) {
      return neonJs.sc.ContractParam.hash160(neonJs.wallet.getScriptHashFromAddress(val));
    }
    return neonJs.sc.ContractParam.hash160(val);
  }
  if (type === "Array") {
    // Assume JSON array string
    try {
      const arr = JSON.parse(val);
      return neonJs.sc.ContractParam.array(arr.map(i => neonJs.sc.ContractParam.any(i)));
    } catch {
      throw new Error("Invalid Array format. Provide a JSON array.");
    }
  }
  return neonJs.sc.ContractParam.string(val);
}

async function handleCreateProposal() {
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first.");
    return;
  }
  if (!isCouncilNode.value) {
    toast.error("Only council nodes can create proposals.");
    return;
  }
  if (!createForm.value.description) {
    toast.error("Please enter a description.");
    return;
  }

  isCreating.value = true;
  try {
    const rpcClient = new neonJs.rpc.RPCClient(getRpcUrl());
    const currentHeight = await rpcClient.getBlockCount();
    
    const targetContract = NATIVE_CONTRACTS[createForm.value.selectedContract];
    const method = createForm.value.selectedMethod;
    
    // Parse args
    const mDef = availableMethods.value.find(m => m.name === method);
    const args = mDef.params.map(p => {
      const val = createForm.value.params[p.name];
      if (val === undefined || val === '') throw new Error(`Missing param: ${p.name}`);
      return normalizeArg(val, p.type);
    });
    
    const script = neonJs.sc.createScript({ scriptHash: targetContract, operation: method, args });
    
    // Create unsigned transaction
    const t = new neonJs.tx.Transaction({
      signers: [{ account: committeeMultiSig.value.scriptHash, scopes: neonJs.tx.WitnessScope.Global }],
      validUntilBlock: currentHeight + 100000, // Long expiration for multisig gathering (~17 days)
      systemFee: 0,
      networkFee: 0,
      script: neonJs.u.HexString.fromHex(script)
    });
    
    // Calculate fees manually as we cannot directly send
    // Just set an arbitrary high fee to ensure it passes when broadcasted.
    t.systemFee = 100000000; // 1 GAS
    t.networkFee = 500000000; // 5 GAS
    
    const unsignedTxHex = t.serialize(false);
    const txHash = t.hash();
    
    const payload = {
      creator_address: connectedAccount.value,
      target_contract: targetContract,
      method: method,
      description: createForm.value.description,
      signers_required: threshold.value,
      eligible_signers: committeePubkeys.value,
      status: "PENDING",
      network: getCurrentEnv().toLowerCase() || "mainnet",
      params: {
        unsigned_tx: unsignedTxHex,
        hash: txHash,
        scriptHash: committeeMultiSig.value.scriptHash,
        committee: committeePubkeys.value
      }
    };
    
    const res = await supabaseService.createMultisigRequest(payload);
    if (!res.success) throw new Error(res.error);
    
    toast.success("Proposal created successfully!");
    showCreateModal.value = false;
    await loadRequests();
  } catch (e) {
    console.error(e);
    toast.error("Failed to create proposal: " + e.message);
  } finally {
    isCreating.value = false;
  }
}

async function autoSignTx() {
  if (!signModalReq.value) return;
  isSigning.value = true;
  try {
    const unsignedTxHex = signModalReq.value.params.unsigned_tx;
    const signature = await walletService.signRawTransaction(unsignedTxHex);
    await submitSig(signature);
  } catch (e) {
    console.error(e);
    toast.error("Signing failed: " + e.message);
  } finally {
    isSigning.value = false;
  }
}

async function submitManualSignature() {
  if (!manualSignature.value) return;
  await submitSig(manualSignature.value.trim());
}

async function submitSig(signatureHex) {
  if (!signatureHex || signatureHex.length < 128) {
    throw new Error("Invalid signature length. Expected at least 64 bytes (128 hex chars).");
  }
  try {
    const res = await supabaseService.addMultisigSignature(signModalReq.value.id, connectedAccount.value, signatureHex);
    if (!res.success) throw new Error(res.error);
    
    toast.success("Signature added successfully!");
    signModalReq.value = null;
    await loadRequests();
  } catch (e) {
    throw new Error("Failed to submit signature: " + e.message);
  }
}

async function handleBroadcast(req) {
  if (!req.params?.unsigned_tx || !req.signatures || req.signatures.length < req.signers_required) {
    toast.error("Not enough signatures or missing tx data.");
    return;
  }
  
  try {
    toast.info("Assembling multisig transaction...");
    const t = neonJs.tx.Transaction.deserialize(req.params.unsigned_tx);
    
    // Sort signatures based on the order of public keys in the committee
    const committee = req.params.committee; // Array of pubkeys
    const sortedSignatures = [];
    
    for (const pubkey of committee) {
      const addr = new neonJs.wallet.Account(pubkey).address;
      const sigObj = req.signatures.find(s => s.signer_address === addr);
      if (sigObj) {
        sortedSignatures.push(sigObj.signature);
      }
      if (sortedSignatures.length >= req.signers_required) break; // We only need M sigs
    }
    
    if (sortedSignatures.length < req.signers_required) {
      throw new Error("Failed to match enough signatures to valid committee members.");
    }
    
    // Construct the MultiSig Invocation script
    const builder = new neonJs.sc.ScriptBuilder();
    for (const sig of sortedSignatures) {
      builder.emitPush(neonJs.u.HexString.fromHex(sig));
    }
    
    const invocationScript = builder.build();
    
    // The verification script is the multisig script
    const verificationScript = neonJs.wallet.Account.createMultiSig(req.signers_required, committee).contract.script;
    
    t.witnesses = [new neonJs.tx.Witness({ invocationScript, verificationScript })];
    
    const signedTxHex = t.serialize(true);
    
    toast.info("Broadcasting to network...");
    const rpcClient = new neonJs.rpc.RPCClient(getRpcUrl());
    const txid = await rpcClient.sendRawTransaction(signedTxHex);
    
    toast.success("Transaction broadcasted! TXID: " + txid);
    
    // Optionally update status in supabase
    // await supabaseService.updateMultisigStatus(req.id, "EXECUTED", txid);
    
  } catch (e) {
    console.error(e);
    toast.error("Failed to broadcast: " + e.message);
  }
}

onMounted(async () => {
  try {
    neonJs = window.Neon || await import('@cityofzion/neon-js');
    await loadCommittee();
    await loadRequests();
  } catch (e) {
    if (import.meta.env.DEV) console.error("Initialization error", e);
  } finally {
    loading.value = false;
  }
});
</script>
