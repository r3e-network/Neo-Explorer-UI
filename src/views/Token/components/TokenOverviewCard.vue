<template>
  <div class="etherscan-card mb-6">
    <div class="card-header">
      <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Overview</h2>
    </div>

    <!-- Token Image -->
    <div v-if="hasTokenImage" class="card-header">
      <img
        :src="image"
        :alt="tokenInfo['tokenname'] ? tokenInfo['tokenname'] + ' icon' : 'Token'"
        class="h-16 w-16 rounded-lg object-contain"
      />
    </div>

    <div class="divide-y divide-card-border dark:divide-card-border-dark">
      <!-- Name -->
      <div class="info-row">
        <div class="info-label">Name</div>
        <div class="info-value">
          {{ tokenInfo["tokenname"] }}
          <span v-if="tokenInfo.ispopular" class="ml-1">&#x1F525;</span>
        </div>
      </div>
      <!-- Hash -->
      <div class="info-row">
        <div class="info-label">Hash</div>
        <div class="info-value flex items-center gap-2">
          <span class="font-hash text-primary-500 break-all">{{ tokenInfo["hash"] }}</span>
          <button
            class="shrink-0 text-gray-400 transition-colors hover:text-primary-500 dark:text-gray-500 dark:hover:text-primary-400"
            title="Copy to clipboard"
            @click="$emit('copy-hash', tokenInfo['hash'])"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
          <span v-if="copied" class="text-xs text-green-500">Copied!</span>
        </div>
      </div>
      <!-- Symbol -->
      <div class="info-row">
        <div class="info-label">Symbol</div>
        <div class="info-value">{{ tokenInfo["symbol"] }}</div>
      </div>
      <!-- Decimals -->
      <div class="info-row">
        <div class="info-label">Decimals</div>
        <div class="info-value">{{ tokenInfo["decimals"] }}</div>
      </div>
      <!-- Standard -->
      <div class="info-row">
        <div class="info-label">Standard</div>
        <div class="info-value">NEP-{{ tokenInfo["type"] }}</div>
      </div>
      <!-- First Transfer -->
      <div class="info-row">
        <div class="info-label">First Transfer</div>
        <div class="info-value">
          <span v-if="tokenInfo.firsttransfertime">
            {{ convertPreciseTime(tokenInfo["firsttransfertime"]) }}
          </span>
          <span v-else class="text-text-muted">&mdash;</span>
        </div>
      </div>
      <!-- Total Supply -->
      <div class="info-row">
        <div class="info-label">Total Supply</div>
        <div class="info-value">
          {{ convertToken(tokenInfo["totalsupply"], decimal) }}
        </div>
      </div>
      <!-- Holders -->
      <div class="info-row">
        <div class="info-label">Holders</div>
        <div class="info-value">{{ tokenInfo["holders"] }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { convertPreciseTime, convertToken } from "@/store/util";

defineProps({
  tokenInfo: {
    type: Object,
    required: true,
  },
  decimal: {
    type: [String, Number],
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  hasTokenImage: {
    type: Boolean,
    default: false,
  },
  copied: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["copy-hash", "view-contract"]);
</script>
