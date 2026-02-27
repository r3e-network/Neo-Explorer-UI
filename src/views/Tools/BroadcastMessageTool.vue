<template>
  <div class="tool-page">
    <section class="page-container py-6 md:py-8">
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'Tools', to: '/tools' }, { label: 'On-Chain Message' }]" />

      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="page-header-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
          </div>
          <div>
            <h1 class="page-title">On-Chain Message</h1>
            <p class="page-subtitle">Send arbitrary data to the Neo N3 blockchain using Transaction Remarks</p>
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
            v-else
            @click="broadcastMessage" 
            :disabled="!message.trim() || isSending || messageBytes > 65535"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            <svg v-if="isSending" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            {{ isSending ? 'Sending...' : 'Broadcast to N3' }}
          </button>
        </div>
      </div>

      <div class="etherscan-card p-6">
        <div class="max-w-3xl mx-auto space-y-6">
          
          <div class="p-4 rounded-xl bg-indigo-50/80 backdrop-blur-sm border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300">
            <div class="flex gap-3">
              <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div class="text-sm">
                <p class="font-bold mb-1">What is a Transaction Remark?</p>
                <p>Remarks (Attribute Type 0x81) allow you to append custom text or binary data directly to a transaction. This data will be permanently recorded on the Neo N3 blockchain but does not affect the contract execution state. It is perfect for leaving a permanent message, a proof-of-existence document hash, or associating metadata with a transaction.</p>
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-high">Message Payload (UTF-8)</label>
              <span class="text-xs font-mono" :class="messageBytes > 65535 ? 'text-red-500 font-bold' : 'text-mid'">{{ messageBytes }} / 65535 Bytes</span>
            </div>
            <textarea 
              v-model="message" 
              class="form-input w-full h-40 resize-y bg-surface text-high placeholder:text-mid/60 font-mono text-sm" 
              placeholder="Enter the message or arbitrary data you want to permanently store on the blockchain... (e.g. 'Hello Neo', JSON data, or a document hash)"
            ></textarea>
            <p v-if="messageBytes > 65535" class="text-xs text-red-500 mt-2 font-medium">Message exceeds maximum remark payload size (65535 bytes).</p>
          </div>
          
          <transition name="fade">
            <div v-if="txHash" class="p-4 rounded-xl border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 text-green-800 dark:text-green-400 flex items-center justify-between">
              <div>
                <p class="text-sm font-bold mb-1">Transaction Broadcasted Successfully!</p>
                <p class="text-xs break-all font-mono opacity-80">{{ txHash }}</p>
              </div>
              <router-link :to="`/transaction-info/${txHash}`" class="text-sm font-semibold hover:underline flex items-center gap-1.5 whitespace-nowrap bg-green-200/50 dark:bg-green-800/50 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-300/50 dark:hover:bg-green-700/50">
                View Tx
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </router-link>
            </div>
          </transition>

        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { connectedAccount } from '@/utils/wallet';
import { walletService } from "@/services/walletService";
import { useToast } from "vue-toastification";

const toast = useToast();
const message = ref("");
const isSending = ref(false);
const txHash = ref("");

const messageBytes = computed(() => {
  return new Blob([message.value]).size;
});


async function broadcastMessage() {
  if (!message.value.trim() || messageBytes.value > 65535) return;
  
  if (!walletService.isConnected) {
    toast.error("Please connect your wallet first via the header.");
    return;
  }

  isSending.value = true;
  txHash.value = "";
  
  try {
    const fromAddress = connectedAccount.value;
    const gasHash = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
    
    toast.info("Preparing transaction for wallet signature...");
    
    const result = await walletService.invoke({
      scriptHash: gasHash,
      operation: "transfer",
      args: [
        { type: "Hash160", value: fromAddress },
        { type: "Hash160", value: fromAddress },
        { type: "Integer", value: "0" },
        { type: "String", value: message.value }
      ],
      signers: [
        { account: fromAddress, scopes: 1 }
      ]
    });

    txHash.value = result.txid;
    toast.success("Message broadcasted to Neo N3!");
    message.value = ""; 
    
  } catch (e) {
    console.error(e);
    toast.error("Failed to broadcast message: " + (e.description || e.message || "User rejected"));
  } finally {
    isSending.value = false;
  }
}
</script>