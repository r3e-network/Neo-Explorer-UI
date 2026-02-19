<template>
  <div class="space-y-4">
    <!-- Wallet Connection Banner -->
    <div
      v-if="!walletConnected"
      class="rounded-xl border border-amber-200 bg-amber-50/85 p-4 backdrop-blur-sm dark:border-amber-800 dark:bg-amber-900/20"
    >
      <div class="flex items-start gap-3">
        <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <h3 class="text-sm font-semibold text-amber-800 dark:text-amber-300">Connect Wallet to Interact</h3>
          <p class="mt-1 text-sm text-amber-700 dark:text-amber-400">To write to this contract, connect a wallet.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="provider in ['NeoLine', 'O3', 'WalletConnect']"
              :key="provider"
              class="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-400 dark:hover:bg-gray-700"
              :disabled="walletConnecting"
              @click="emit('connectWallet', provider)"
            >
              {{ walletConnecting ? "Connecting..." : provider }}
            </button>
          </div>
          <p v-if="walletError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ walletError }}</p>
        </div>
      </div>
    </div>

    <!-- WalletConnect URI Modal -->
    <WalletConnectModal v-if="wcUri" :uri="wcUri" :visible="!!wcUri" @close="emit('clearWcUri')" />

    <!-- Connected wallet banner -->
    <div
      v-if="walletConnected"
      class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50/85 p-3 backdrop-blur-sm dark:border-green-800 dark:bg-green-900/20"
    >
      <div class="flex items-center gap-2">
        <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-sm font-medium text-green-800 dark:text-green-300">
          Connected: {{ walletAccount?.address ? truncateHash(walletAccount.address, 8, 6) : "" }}
        </span>
        <span
          class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          {{ walletProvider }}
        </span>
      </div>
      <button
        class="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400"
        @click="emit('disconnectWallet')"
      >
        Disconnect
      </button>
    </div>

    <div v-if="!manifest" class="py-8 text-center text-text-secondary dark:text-gray-400">
      Loading contract manifest...
    </div>
    <div v-else-if="!writeMethods.length" class="py-8 text-center text-text-secondary dark:text-gray-400">
      No write methods found in this contract.
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="(method, wIdx) in writeMethods"
        :key="'wm-' + method.name"
        class="surface-panel overflow-hidden rounded-xl"
      >
        <!-- Method header (clickable) -->
        <button
          class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/40 dark:hover:bg-gray-800/35"
          :aria-expanded="writeMethodState[wIdx]?.open"
          @click="emit('toggleMethod', wIdx)"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex h-6 w-6 items-center justify-center rounded bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              {{ wIdx + 1 }}
            </span>
            <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">
              {{ method.name }}
            </span>
            <span
              class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              Write
            </span>
          </div>
          <svg
            class="h-4 w-4 text-gray-400 transition-transform duration-200 dark:text-gray-500"
            :class="{ 'rotate-180': writeMethodState[wIdx]?.open }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <!-- Expandable method body -->
        <div
          v-if="writeMethodState[wIdx]?.open"
          class="border-t px-4 pb-4 soft-divider"
        >
          <!-- Parameters -->
          <div v-if="method.parameters && method.parameters.length" class="mt-3 space-y-2">
            <ParamInput
              v-for="(param, pIdx) in method.parameters"
              :key="'wp-' + pIdx"
              :type="param.type"
              :name="param.name"
              :model-value="writeMethodState[wIdx].params[pIdx] || ''"
              @update:model-value="emit('updateParam', wIdx, pIdx, $event)"
            />
          </div>
          <div v-else class="mt-3 text-xs text-text-secondary dark:text-gray-400">No parameters required.</div>

          <!-- Signer Scope -->
          <div class="mt-3 flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary dark:text-gray-400">Signer Scope</label>
            <select v-model="signerScopes[wIdx]" class="form-input text-sm">
              <option :value="1">CalledByEntry (default)</option>
              <option :value="128">Global</option>
              <option :value="16">CustomContracts</option>
              <option :value="32">CustomGroups</option>
            </select>
          </div>

          <!-- Action buttons -->
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <!-- Gas Estimate button -->
            <button
              class="btn-outline inline-flex items-center gap-1 px-3 py-2 text-xs disabled:opacity-50"
              :disabled="writeMethodState[wIdx]?.estimating"
              @click="emit('estimateGas', wIdx, method)"
            >
              {{ writeMethodState[wIdx]?.estimating ? "Estimating..." : "Estimate GAS" }}
            </button>
            <!-- Write button -->
            <button
              class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :class="walletConnected ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-400 cursor-not-allowed'"
              :disabled="!walletConnected || writeMethodState[wIdx]?.loading"
              @click="emit('invokeMethod', wIdx, method, signerScopes[wIdx] || 1)"
            >
              <svg v-if="writeMethodState[wIdx]?.loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ !walletConnected ? "Connect Wallet First" : writeMethodState[wIdx]?.loading ? "Sending..." : "Write" }}
            </button>
          </div>

          <!-- Gas estimate display -->
          <p v-if="writeMethodState[wIdx]?.gasEstimate" class="mt-2 text-xs text-text-secondary dark:text-gray-400">
            Estimated GAS:
            <span class="font-mono font-medium text-text-primary dark:text-gray-200">
              {{ writeMethodState[wIdx].gasEstimate }}
            </span>
          </p>

          <!-- Result with tx tracking -->
          <div
            v-if="writeMethodState[wIdx]?.result !== undefined"
            class="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
          >
            <h5 class="mb-1 text-xs font-semibold text-green-700 dark:text-green-400">Transaction Submitted</h5>
            <p class="break-all font-mono text-xs text-green-800 dark:text-green-300">
              TxID: {{ writeMethodState[wIdx].result?.txid || writeMethodState[wIdx].result }}
            </p>
            <!-- Tx tracking status -->
            <div v-if="getTxStatus(writeMethodState[wIdx].result?.txid)" class="mt-1.5 flex items-center gap-1.5">
              <span
                class="inline-block h-2 w-2 rounded-full"
                :class="
                  getTxStatus(writeMethodState[wIdx].result?.txid) === 'confirmed'
                    ? 'bg-green-500'
                    : getTxStatus(writeMethodState[wIdx].result?.txid) === 'pending'
                    ? 'bg-yellow-400 animate-pulse'
                    : 'bg-gray-400'
                "
              />
              <span class="text-[10px] font-medium capitalize text-text-secondary dark:text-gray-400">
                {{ getTxStatus(writeMethodState[wIdx].result?.txid) }}
              </span>
            </div>
          </div>
          <!-- Error -->
          <div
            v-if="writeMethodState[wIdx]?.error"
            class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
          >
            <p class="text-xs text-red-600 dark:text-red-400">{{ writeMethodState[wIdx].error }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { truncateHash } from "@/utils/explorerFormat";
import ParamInput from "@/components/contract/ContractParamInput.vue";
import WalletConnectModal from "./WalletConnectModal.vue";

const props = defineProps({
  writeMethods: { type: Array, required: true },
  writeMethodState: { type: Array, required: true },
  manifest: { type: Object, default: null },
  walletConnected: { type: Boolean, default: false },
  walletAccount: { type: Object, default: null },
  walletProvider: { type: String, default: "" },
  walletConnecting: { type: Boolean, default: false },
  walletError: { type: String, default: "" },
  wcUri: { type: String, default: "" },
  txStatuses: { type: Object, default: () => ({}) },
});

const emit = defineEmits([
  "connectWallet",
  "disconnectWallet",
  "clearWcUri",
  "toggleMethod",
  "invokeMethod",
  "updateParam",
  "estimateGas",
]);

const signerScopes = ref({});

function getTxStatus(txid) {
  if (!txid) return null;
  return props.txStatuses[txid] || "pending";
}
</script>
