<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
    <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'Multi-Signature Wallet' }]" />

    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </div>
        <div>
          <h1 class="page-title">Multi-Signature Wallet</h1>
          <p class="page-subtitle">Create co-owned transactions, coordinate signatures, and execute operations safely</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button 
          :disabled="!connectedAccount"
          @click="showCreateModal = true" 
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary-700"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          New Request
        </button>
      </div>
    </div>

    <div class="etherscan-card p-6">
      <div v-if="loading" class="space-y-4">
        <Skeleton v-for="i in 3" :key="i" height="80px" />
      </div>
      <div v-else-if="requests.length === 0" class="text-center py-12 text-mid">
        <svg class="mx-auto h-12 w-12 text-low mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>No multi-sig requests found.</p>
        <button v-if="connectedAccount" @click="showCreateModal = true" class="text-primary-500 hover:underline mt-2 text-sm font-medium">Create the first one</button>
        <span v-else class="mt-2 block text-sm font-medium text-mid">Connect wallet from the top bar to create</span>
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
                <span>Target: {{ req.target_contract }}</span>
                <span>•</span>
                <span>Tx: {{ req.params?.hash ? req.params.hash.slice(0, 8) + '...' : 'N/A' }}</span>
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
                 <div v-else-if="connectedAccount && req.eligible_signers?.includes(connectedAccount) && !hasSigned(req)">
                    <button @click="openSignModal(req)" class="px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors">Sign Tx</button>
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
          <div class="mt-4 pt-4 border-t border-line-soft">
            <div class="text-xs font-semibold text-high mb-2">Target Signers</div>
            <div class="flex flex-wrap gap-2">
               <span v-for="signer in (req.eligible_signers || [])" :key="signer" 
                     class="inline-flex items-center px-2 py-1 rounded border text-xs font-mono"
                     :class="req.signatures?.find(s => s.signer_address === signer) ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-surface-muted border-line-soft text-mid'">
                 {{ connectedAccount === signer ? 'You' : signer.slice(0,4) + '...' + signer.slice(-4) }}
                 <svg v-if="req.signatures?.find(s => s.signer_address === signer)" class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
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
          <h2 class="text-lg font-bold text-high">Sign Transaction</h2>
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
             <p class="text-xs text-mid mb-2">Use a secure offline environment to sign the transaction hex, then paste the signature below.</p>
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
          <h2 class="text-lg font-bold text-high">Create Multi-Sig Request</h2>
          <button @click="showCreateModal = false" class="text-low hover:text-high"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
           <div>
             <label class="block text-sm font-medium text-high mb-1">Request Name</label>
             <input v-model="createForm.description" type="text" class="form-input w-full" placeholder="e.g. Monthly Payroll" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Target Contract Hash</label>
             <input v-model="createForm.targetContract" type="text" class="form-input w-full" placeholder="0x..." list="fast-contracts" />
             <datalist id="fast-contracts">
                <option value="0xf0151f528127558851b39c2cd8aa47da7418ab28">Flamingo (FLM)</option>
                <option value="0x48c40d4666f93408be1bef038b6722404d9a4c2a">NeoBurger (bNEO)</option>
                <option value="0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5">NEO Token</option>
                <option value="0xd2a4cff31913016155e38e474a2c06d08be276cf">GAS Token</option>
             </datalist>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Method</label>
             <input v-model="createForm.method" type="text" class="form-input w-full" placeholder="e.g. transfer" />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Arguments (JSON Array)</label>
             <input v-model="createForm.argsStr" type="text" class="form-input w-full font-mono text-sm" placeholder='[{"type":"Hash160","value":"..."}]' />
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Multi-Sig Signer Public Keys (comma separated)</label>
             <textarea v-model="createForm.pubkeys" class="form-input w-full font-mono text-xs" rows="3" placeholder="03..., 02..."></textarea>
           </div>
           <div>
             <label class="block text-sm font-medium text-high mb-1">Signatures Required (Threshold)</label>
             <input v-model="createForm.threshold" type="number" class="form-input w-full" value="2" min="1" />
           </div>
        </div>
        <div class="px-6 py-4 border-t border-line-soft bg-slate-50 flex justify-end gap-3 dark:bg-slate-900">
          <button @click="showCreateModal = false" class="px-4 py-2 text-sm font-medium text-mid hover:text-high transition-colors">Cancel</button>
          <button @click="handleCreateRequest" :disabled="isCreating" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors active:scale-95 disabled:opacity-50">
            {{ isCreating ? 'Creating...' : 'Create Request' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Details Modal -->
    <div v-if="detailsModalReq" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div class="w-full max-w-2xl rounded-2xl border border-line-soft bg-white shadow-2xl overflow-hidden relative z-10 dark:bg-slate-950 flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-line-soft flex items-center justify-between">
          <h2 class="text-lg font-bold text-high">Request Details</h2>
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
import { ref, onMounted } from 'vue';
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

let neonJs = null;

const createForm = ref({
  description: '',
  targetContract: '',
  method: '',
  argsStr: '[]',
  pubkeys: '',
  threshold: 2
});

const isCreating = ref(false);

async function loadRequests() {
  try {
    const data = await supabaseService.getMultisigRequests();
    requests.value = data.filter(r => r.type !== 'governance') || [];
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

async function handleCreateRequest() {
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first.");
    return;
  }
  if (!createForm.value.description || !createForm.value.targetContract || !createForm.value.method) {
    toast.error("Please fill all required fields.");
    return;
  }

  isCreating.value = true;
  try {
    const pubkeys = createForm.value.pubkeys.split(',').map(p => p.trim()).filter(p => p);
    if (pubkeys.length === 0) throw new Error("Need at least 1 public key");
    
    // Sort public keys lexically (standard for multisig)
    pubkeys.sort((a,b) => a.localeCompare(b));
    
    const threshold = parseInt(createForm.value.threshold);
    if (threshold < 1 || threshold > pubkeys.length) {
      throw new Error("Invalid threshold");
    }

    const mAccount = neonJs.wallet.Account.createMultiSig(threshold, pubkeys);
    const eligibleSigners = pubkeys.map(pk => new neonJs.wallet.Account(pk).address);

    const rpcClient = new neonJs.rpc.RPCClient(getRpcUrl());
    const currentHeight = await rpcClient.getBlockCount();
    
    let args = [];
    try {
      const parsed = JSON.parse(createForm.value.argsStr);
      if (Array.isArray(parsed)) {
        args = parsed.map(a => neonJs.sc.ContractParam.fromJson(a));
      }
    } catch {
      throw new Error("Invalid args JSON");
    }
    
    let target = createForm.value.targetContract;
    if (target.startsWith('0x')) target = target.slice(2);
    
    const script = neonJs.sc.createScript({ scriptHash: target, operation: createForm.value.method, args });
    
    const t = new neonJs.tx.Transaction({
      signers: [{ account: mAccount.scriptHash, scopes: neonJs.tx.WitnessScope.Global }],
      validUntilBlock: currentHeight + 100000,
      systemFee: 100000000,
      networkFee: 500000000,
      script: neonJs.u.HexString.fromHex(script)
    });
    
    const unsignedTxHex = t.serialize(false);
    
    const payload = {
      creator_address: connectedAccount.value,
      target_contract: target,
      method: createForm.value.method,
      description: createForm.value.description,
      signers_required: threshold,
      eligible_signers: eligibleSigners,
      status: "PENDING",
      network: getCurrentEnv().toLowerCase() || "mainnet",
      params: {
        unsigned_tx: unsignedTxHex,
        hash: t.hash(),
        scriptHash: mAccount.scriptHash,
        pubkeys: pubkeys
      }
    };
    
    const res = await supabaseService.createMultisigRequest(payload);
    if (!res.success) throw new Error(res.error);
    
    toast.success("MultiSig Request created successfully!");
    showCreateModal.value = false;
    await loadRequests();
  } catch (e) {
    console.error(e);
    toast.error("Failed to create request: " + e.message);
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
    
    const pubkeys = req.params.pubkeys;
    const sortedSignatures = [];
    
    for (const pubkey of pubkeys) {
      const addr = new neonJs.wallet.Account(pubkey).address;
      const sigObj = req.signatures.find(s => s.signer_address === addr);
      if (sigObj) {
        sortedSignatures.push(sigObj.signature);
      }
      if (sortedSignatures.length >= req.signers_required) break;
    }
    
    if (sortedSignatures.length < req.signers_required) {
      throw new Error("Failed to match enough signatures.");
    }
    
    const builder = new neonJs.sc.ScriptBuilder();
    for (const sig of sortedSignatures) {
      builder.emitPush(neonJs.u.HexString.fromHex(sig));
    }
    
    const invocationScript = builder.build();
    const verificationScript = neonJs.wallet.Account.createMultiSig(req.signers_required, pubkeys).contract.script;
    
    t.witnesses = [new neonJs.tx.Witness({ invocationScript, verificationScript })];
    
    const signedTxHex = t.serialize(true);
    
    toast.info("Broadcasting to network...");
    const rpcClient = new neonJs.rpc.RPCClient(getRpcUrl());
    const txid = await rpcClient.sendRawTransaction(signedTxHex);
    
    toast.success("Transaction broadcasted! TXID: " + txid);
    
  } catch (e) {
    console.error(e);
    toast.error("Failed to broadcast: " + e.message);
  }
}

onMounted(async () => {
  try {
    neonJs = window.Neon || await import('@cityofzion/neon-js');
    await loadRequests();
  } catch (e) {
    if (import.meta.env.DEV) console.error("Initialization error", e);
  } finally {
    loading.value = false;
  }
});
</script>
