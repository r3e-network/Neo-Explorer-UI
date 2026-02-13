<template>
  <div class="tx-flow-diagram">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <svg
        class="h-8 w-8 animate-spin text-primary-500"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>

    <div
      v-else-if="transfers.length === 0"
      class="py-8 text-center text-sm text-gray-500"
    >
      No token transfers found
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(transfer, index) in transfers"
        :key="index"
        class="flex items-center gap-3"
      >
        <div class="flex flex-col items-center">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full"
            :class="getDirectionClass(transfer)"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <div
            v-if="index < transfers.length - 1"
            class="h-4 w-0.5 bg-gray-200 dark:bg-gray-700"
          ></div>
        </div>

        <div
          class="flex-1 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <HashLink :hash="transfer.from" type="address" :truncate="true" />
              <svg
                class="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
              <HashLink :hash="transfer.to" type="address" :truncate="true" />
            </div>
            <div class="text-right">
              <div class="font-medium text-gray-900 dark:text-gray-100">
                {{ formatAmount(transfer.amount, transfer.decimals) }}
              </div>
              <div class="text-xs text-gray-500">{{ transfer.symbol }}</div>
            </div>
          </div>

          <div v-if="transfer.tokenId" class="mt-2 text-xs text-gray-500">
            Token ID:
            <span class="font-mono">{{
              truncateTokenId(transfer.tokenId)
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import HashLink from "@/components/common/HashLink.vue";

const props = defineProps({
  transfers: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  address: { type: String, default: "" },
});

function formatAmount(amount, decimals = 8) {
  if (!amount) return "0";
  const value = Number(amount) / Math.pow(10, decimals);
  if (value === 0) return "0";
  if (value < 0.0001) return value.toExponential(4);
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function truncateTokenId(tokenId) {
  if (!tokenId) return "";
  const str = String(tokenId);
  if (str.length <= 16) return str;
  return str.substring(0, 8) + "..." + str.substring(str.length - 8);
}

function getDirectionClass(transfer) {
  if (!props.address)
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  if (transfer.from === props.address) {
    return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
  }
  if (transfer.to === props.address) {
    return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
  }
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}
</script>

<style scoped>
.tx-flow-diagram {
  @apply text-sm;
}
</style>
