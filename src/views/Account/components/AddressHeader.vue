<template>
  <div class="detail-hero">
    <div class="flex items-start gap-3">
      <div class="page-header-icon bg-orange-100 text-orange-500 dark:bg-orange-900/40 dark:text-orange-400">
        <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h1 class="page-title">Address</h1>
          <span
            v-if="isContract"
            class="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
          >
            Contract
          </span>
        </div>
        <div class="detail-metadata">
          <span class="detail-chip font-hash break-all">{{ address }}</span>
          <CopyButton :text="address" />
          <button
            class="detail-chip hover:text-primary-600 dark:hover:text-primary-300"
            title="Show QR Code"
            aria-label="Toggle QR code display"
            @click="$emit('update:showQr', !showQr)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z"
              />
            </svg>
            QR
          </button>
        </div>
        <!-- QR code placeholder -->
        <div
          v-if="showQr"
          class="surface-panel mt-3 inline-block rounded-xl p-4"
        >
          <div class="flex flex-col items-center gap-2">
            <svg class="text-low h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z"
              />
            </svg>
            <p class="text-mid max-w-[200px] break-all text-center font-hash text-xs">
              {{ address }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Balance overview cards -->
  <div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
    <div class="stat-card">
      <p class="stat-label">NEO Balance</p>
      <p class="stat-value">{{ formatBalance(neoBalance, 8) }}</p>
    </div>
    <div class="stat-card">
      <p class="stat-label">GAS Balance</p>
      <p class="stat-value">{{ formatBalance(gasBalance, 8) }}</p>
    </div>
    <div class="stat-card">
      <p class="stat-label">Transactions</p>
      <p class="stat-value">{{ formatNumber(txCount) }}</p>
    </div>
    <div class="stat-card">
      <p class="stat-label">Token Holdings</p>
      <p class="stat-value">{{ formatNumber(tokenCount) }}</p>
    </div>
  </div>
</template>

<script setup>
import { formatNumber, formatBalance } from "@/utils/explorerFormat";
import CopyButton from "@/components/common/CopyButton.vue";

defineProps({
  address: { type: String, default: "" },
  isContract: { type: Boolean, default: false },
  showQr: { type: Boolean, default: false },
  neoBalance: { type: String, default: "0" },
  gasBalance: { type: String, default: "0" },
  txCount: { type: Number, default: 0 },
  tokenCount: { type: Number, default: 0 },
});

defineEmits(["update:showQr"]);
</script>
