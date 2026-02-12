<template>
  <div class="block-detail-page">
    <div class="mx-auto max-w-[1400px] px-4 py-6">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[
          { label: 'Home', to: '/homepage' },
          { label: 'Blocks', to: '/blocks/1' },
          { label: block.index != null ? `Block #${formatNumber(block.index)}` : 'Block' },
        ]"
      />

      <!-- Page Header with Nav -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <div
            class="page-header-icon bg-primary-100 dark:bg-primary-900/40"
          >
            <svg class="h-6 w-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
            </svg>
          </div>
          <div>
            <h1 class="page-title">
              Block #{{ formatNumber(block.index ?? 0) }}
            </h1>
            <p class="page-subtitle" v-if="!loading">{{ timeAgo }}</p>
          </div>
        </div>
        <!-- Prev / Next Navigation -->
        <div class="flex items-center gap-2">
          <button
            @click="navigateBlock((block.index ?? 0) - 1)"
            :disabled="block.index == null || block.index <= 0"
            class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Previous block"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>
          <button
            @click="navigateBlock((block.index ?? 0) + 1)"
            :disabled="block.index == null || block.index >= latestBlockHeight"
            class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Next block"
          >
            Next
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="etherscan-card p-6">
          <Skeleton width="30%" height="24px" class="mb-6" />
          <div class="space-y-4">
            <div v-for="i in 10" :key="i" class="flex gap-4">
              <Skeleton width="120px" height="18px" />
              <Skeleton width="60%" height="18px" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <ErrorState v-else-if="error" title="Block not found" :message="error" @retry="loadBlock(route.params.hash)" />

      <!-- Block Content -->
      <div v-else class="space-y-6">
        <!-- Overview Card -->
        <div class="etherscan-card overflow-hidden">
          <div class="card-header">
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Overview</h2>
          </div>
          <div class="p-4 md:p-6">
            <!-- Block Height -->
            <InfoRow label="Block Height">
              <span class="font-mono font-medium">{{ formatNumber(block.index) }}</span>
            </InfoRow>

            <!-- Timestamp -->
            <InfoRow label="Timestamp">
              <svg class="mr-1.5 inline h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{{ formatTimestamp(block.timestamp) }}</span>
              <span class="ml-1.5 text-text-secondary">({{ timeAgo }})</span>
            </InfoRow>

            <!-- Transactions -->
            <InfoRow label="Transactions">
              <span
                v-if="blockTransactionCount > 0"
                class="inline-flex items-center rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
              >
                {{ blockTransactionCount }} transaction{{ blockTransactionCount !== 1 ? "s" : "" }}
              </span>
              <span v-else class="text-text-secondary">0 transactions</span>
            </InfoRow>

            <!-- Validator / Next Consensus -->
            <InfoRow label="Validated By" tooltip="The consensus node that proposed this block">
              <HashLink v-if="block.nextconsensus" :hash="block.nextconsensus" type="address" />
              <span v-else class="text-text-secondary">--</span>
            </InfoRow>

            <!-- Size -->
            <InfoRow label="Size">
              <span>{{ formatBytes(block.size) }}</span>
            </InfoRow>
          </div>
        </div>

        <!-- Details Card -->
        <div class="etherscan-card overflow-hidden">
          <div class="card-header">
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Details</h2>
          </div>
          <div class="p-4 md:p-6">
            <!-- Block Hash -->
            <InfoRow label="Hash" :copyable="true" :copy-value="block.hash">
              <span class="font-mono text-sm break-all">{{ block.hash }}</span>
            </InfoRow>

            <!-- Previous Hash -->
            <InfoRow label="Previous Hash">
              <router-link
                v-if="
                  block.prevhash &&
                  block.prevhash !== '0x0000000000000000000000000000000000000000000000000000000000000000'
                "
                :to="`/block-info/${block.prevhash}`"
                class="etherscan-link font-mono text-sm break-all"
              >
                {{ block.prevhash }}
              </router-link>
              <span v-else class="font-mono text-sm text-text-secondary">Genesis Block (no previous)</span>
            </InfoRow>

            <!-- Merkle Root -->
            <InfoRow label="Merkle Root">
              <span class="font-mono text-sm break-all text-text-primary dark:text-gray-300">
                {{ block.merkleroot || "--" }}
              </span>
            </InfoRow>

            <!-- Next Consensus -->
            <InfoRow label="Next Consensus" tooltip="Address of the next consensus node">
              <HashLink v-if="block.nextconsensus" :hash="block.nextconsensus" type="address" :truncate="false" />
              <span v-else class="text-text-secondary">--</span>
            </InfoRow>

            <!-- Version -->
            <InfoRow label="Version">
              <span>{{ block.version ?? "--" }}</span>
            </InfoRow>

            <!-- Nonce -->
            <InfoRow v-if="block.nonce" label="Nonce">
              <span class="font-mono text-sm">{{ block.nonce }}</span>
            </InfoRow>
          </div>
        </div>

        <!-- Fees & Reward Card -->
        <div class="etherscan-card overflow-hidden">
          <div class="card-header">
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">Fees &amp; Reward</h2>
          </div>
          <div class="p-4 md:p-6">
            <InfoRow label="System Fee Total">
              <span class="font-mono">{{ formatGas(block.sysfee || block.totalSysFee || 0) }} GAS</span>
            </InfoRow>
            <InfoRow label="Network Fee Total">
              <span class="font-mono">{{ formatGas(block.netfee || block.totalNetFee || 0) }} GAS</span>
            </InfoRow>
            <InfoRow v-if="reward !== null" label="GAS Reward" tooltip="Block reward distributed to consensus nodes">
              <span class="font-mono text-green-600 dark:text-green-400"> {{ formatGas(reward) }} GAS </span>
            </InfoRow>
          </div>
        </div>

        <!-- Witnesses (Collapsible) -->
        <div v-if="block.witnesses && block.witnesses.length > 0" class="etherscan-card overflow-hidden">
          <button
            @click="showWitnesses = !showWitnesses"
            aria-label="Toggle witnesses section"
            :aria-expanded="showWitnesses"
            class="flex w-full items-center justify-between border-b border-card-border px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-card-border-dark dark:hover:bg-gray-800/60"
          >
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">
              Witnesses
              <span class="ml-1.5 text-sm font-normal text-text-secondary"> ({{ block.witnesses.length }}) </span>
            </h2>
            <svg
              class="h-5 w-5 text-gray-400 transition-transform dark:text-gray-500"
              :class="{ 'rotate-180': showWitnesses }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-if="showWitnesses" class="divide-y divide-card-border dark:divide-card-border-dark">
            <div v-for="(w, idx) in block.witnesses" :key="idx" class="p-4">
              <p class="mb-1 text-xs font-medium text-text-secondary">Witness #{{ idx + 1 }}</p>
              <div class="space-y-2">
                <div>
                  <span class="text-xs text-text-secondary">Invocation:</span>
                  <p class="mt-0.5 break-all font-mono text-xs text-gray-700 dark:text-gray-300">
                    {{ w.invocation }}
                  </p>
                </div>
                <div>
                  <span class="text-xs text-text-secondary">Verification:</span>
                  <p class="mt-0.5 break-all font-mono text-xs text-gray-700 dark:text-gray-300">
                    {{ w.verification }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- dBFT Consensus Info -->
        <div v-once class="etherscan-card overflow-hidden">
          <div class="card-header">
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">dBFT 2.0 Consensus</h2>
          </div>
          <div class="p-4 md:p-6">
            <InfoRow label="Consensus Model">
              <span>Delegated Byzantine Fault Tolerance (dBFT 2.0)</span>
            </InfoRow>
            <InfoRow label="Block Time">
              <span>~15 seconds</span>
            </InfoRow>
            <InfoRow label="Finality">
              <span class="inline-flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full bg-green-500"></span>
                Deterministic (single-block finality)
              </span>
            </InfoRow>
            <InfoRow label="Primary Index" v-if="block.primary !== undefined && block.primary !== null">
              <span class="font-mono">{{ block.primary }}</span>
            </InfoRow>
          </div>
        </div>

        <!-- Transactions in Block -->
        <div class="etherscan-card overflow-hidden">
          <div class="card-header">
            <h2 class="text-base font-semibold text-text-primary dark:text-gray-100">
              Transactions
              <span class="ml-1.5 text-sm font-normal text-text-secondary"> ({{ blockTransactionCount }}) </span>
            </h2>
          </div>

          <!-- Tx Loading -->
          <div v-if="txLoading" class="divide-y divide-card-border dark:divide-card-border-dark">
            <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-4 py-3">
              <Skeleton width="50%" height="18px" />
              <Skeleton width="20%" height="18px" />
              <Skeleton width="15%" height="18px" />
            </div>
          </div>

          <!-- Tx Empty -->
          <EmptyState v-else-if="transactions.length === 0" :message="emptyTransactionsMessage" icon="tx" />

          <!-- Tx Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[700px]">
              <thead class="bg-gray-50 text-xs uppercase tracking-wide dark:bg-gray-800">
                <tr>
                  <th class="table-header-cell">Txn Hash</th>
                  <th class="table-header-cell">Sender</th>
                  <th class="table-header-cell-right">System Fee</th>
                  <th class="table-header-cell-right">Net Fee</th>
                  <th class="table-header-cell-right">Size</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-card-border dark:divide-card-border-dark">
                <tr
                  v-for="tx in transactions"
                  :key="tx.hash"
                  class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <td class="table-cell">
                    <HashLink :hash="tx.hash" type="tx" />
                  </td>
                  <td class="table-cell">
                    <HashLink v-if="tx.sender" :hash="tx.sender" type="address" />
                    <span v-else class="text-sm text-text-secondary">--</span>
                  </td>
                  <td class="table-cell text-right font-mono">
                    {{ formatGas(tx.sysfee || 0) }}
                  </td>
                  <td class="table-cell text-right font-mono">
                    {{ formatGas(tx.netfee || 0) }}
                  </td>
                  <td class="table-cell-secondary text-right">
                    {{ formatBytes(tx.size) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { blockService } from "@/services";
import { formatNumber, formatAge, formatBytes, formatGas } from "@/utils/explorerFormat";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import InfoRow from "@/components/common/InfoRow.vue";
import HashLink from "@/components/common/HashLink.vue";

import Skeleton from "@/components/common/Skeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";

const route = useRoute();
const router = useRouter();

// --- State ---
const abortController = ref(null);
const block = ref({});
const reward = ref(null);
const transactions = ref([]);
const loading = ref(false);
const txLoading = ref(false);
const error = ref(null);
const showWitnesses = ref(false);
const latestBlockHeight = ref(Infinity);
const BLOCK_TX_FETCH_BATCH_SIZE = 100;

// --- Computed ---
const blockTransactionCount = computed(() => {
  const declared = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);
  if (Number.isFinite(declared) && declared > 0) {
    return declared;
  }

  return transactions.value.length;
});

const emptyTransactionsMessage = computed(() =>
  blockTransactionCount.value > 0
    ? "Transactions are still indexing for this block. Please retry in a few seconds."
    : "No transactions in this block"
);

const timeAgo = computed(() => {
  if (!block.value?.timestamp) return "";
  return formatAge(block.value.timestamp);
});

// --- Methods ---
function formatTimestamp(ts) {
  if (!ts) return "";
  const ms = ts > 1e12 ? ts : ts * 1000;
  const d = new Date(ms);
  return d.toUTCString();
}

async function loadBlock(hash) {
  abortController.value?.abort();
  abortController.value = new AbortController();
  loading.value = true;
  error.value = null;
  reward.value = null;
  transactions.value = [];
  showWitnesses.value = false;

  try {
    // Fetch block info and raw block data in parallel
    const [info, raw] = await Promise.all([blockService.getInfoByHash(hash), blockService.getByHash(hash)]);

    if (abortController.value?.signal.aborted) return;

    if (!info && !raw) {
      error.value = "Block not found. The hash may be invalid.";
      return;
    }

    // Merge info + raw for maximum field coverage
    block.value = { ...(raw || {}), ...(info || {}) };

    const mergedTxCount = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);
    if (Number.isFinite(mergedTxCount) && mergedTxCount > 0) {
      block.value.txcount = mergedTxCount;
      block.value.transactioncount = mergedTxCount;
    }

    // Fetch latest block height for next-button disabled logic
    blockService
      .getCount()
      .then((count) => {
        if (abortController.value?.signal.aborted) return;
        if (count > 0) latestBlockHeight.value = count - 1;
      })
      .catch(() => {});

    // Load transactions and reward in parallel (non-blocking)
    loadTransactions();
    loadReward(hash);
  } catch (err) {
    if (abortController.value?.signal.aborted) return;
    if (process.env.NODE_ENV !== "production") console.error("Failed to load block details:", err);
    error.value = "Failed to load block details. Please try again.";
  } finally {
    loading.value = false;
  }
}

async function loadTransactions() {
  txLoading.value = true;
  try {
    const blockHash = block.value?.hash;
    const blockIndex = Number(block.value?.index);
    if (!blockHash) {
      transactions.value = [];
      return;
    }

    if (Array.isArray(block.value.tx) && block.value.tx.length > 0) {
      transactions.value = block.value.tx;
      if (!block.value.txcount) {
        block.value.txcount = block.value.tx.length;
        block.value.transactioncount = block.value.tx.length;
      }
      return;
    }

    const declaredCount = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);

    const fetchPagedTransactions = async (fetchFn, expectedCount) => {
      let maxToLoad = expectedCount > 0 ? expectedCount : BLOCK_TX_FETCH_BATCH_SIZE;
      let loaded = 0;
      const collected = [];

      while (loaded < maxToLoad) {
        if (abortController.value?.signal.aborted) return { collected, expectedTotal: maxToLoad };

        const limit = Math.min(BLOCK_TX_FETCH_BATCH_SIZE, maxToLoad - loaded);
        const res = await fetchFn(limit, loaded);

        if (abortController.value?.signal.aborted) return { collected, expectedTotal: maxToLoad };

        const list = Array.isArray(res?.result) ? res.result : [];
        if (loaded === 0) {
          const totalFromApi = Number(res?.totalCount || 0);
          if (Number.isFinite(totalFromApi) && totalFromApi > maxToLoad) {
            maxToLoad = totalFromApi;
          }
        }

        if (list.length === 0) {
          break;
        }

        collected.push(...list);
        loaded += list.length;

        if (list.length < limit) {
          break;
        }
      }

      return { collected, expectedTotal: maxToLoad };
    };

    let { collected, expectedTotal } = await fetchPagedTransactions(
      (limit, skip) => blockService.getTransactionsByHash(blockHash, limit, skip),
      declaredCount
    );

    if (
      collected.length === 0 &&
      Number.isFinite(blockIndex) &&
      blockIndex >= 0 &&
      declaredCount > 0
    ) {
      const fallback = await fetchPagedTransactions(
        (limit, skip) => blockService.getTransactionsByHeight(blockIndex, limit, skip),
        declaredCount
      );
      collected = fallback.collected;
      expectedTotal = fallback.expectedTotal;
    }

    if (abortController.value?.signal.aborted) return;

    transactions.value = collected;

    const resolvedCount = Number(block.value?.txcount ?? block.value?.transactioncount ?? 0);
    if ((!resolvedCount || resolvedCount <= 0) && collected.length > 0) {
      block.value.txcount = Math.max(collected.length, expectedTotal);
      block.value.transactioncount = block.value.txcount;
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("Failed to load block transactions:", err);
  } finally {
    txLoading.value = false;
  }
}


async function loadReward(_hash) {
  try {
    // Try to get reward from block info fields first
    const r = block.value.gasconsumed || block.value.reward;
    if (r) {
      reward.value = r;
      return;
    }
    // No dedicated reward endpoint in blockService, use what we have
    reward.value = 0;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("Failed to load block reward:", err);
  }
}

function navigateBlock(height) {
  if (height < 0) return;
  // We need to get the block hash by height, then navigate
  blockService.getByHeight(height).then((b) => {
    if (b?.hash) {
      router.push(`/block-info/${b.hash}`);
    }
  });
}

onBeforeUnmount(() => {
  abortController.value?.abort();
});

// --- Route watcher ---
watch(
  () => route.params.hash,
  (hash) => {
    if (hash) loadBlock(hash);
  },
  { immediate: true }
);
</script>
