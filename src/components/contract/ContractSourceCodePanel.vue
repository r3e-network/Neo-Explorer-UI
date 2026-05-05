<template>
  <div>
    <div
      v-if="showToolbar"
      class="panel-muted mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between"
    >
      <div class="text-mid text-sm">
        <span v-if="contractHash"> Contract: {{ truncateHash(contractHash, 14, 10) }} </span>
        <span v-else>{{ $t('inline.provideContractHash') }}</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="badge-soft rounded-full px-3 py-1"> Files: {{ totalCount }} </span>
        <button
          class="btn-outline px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          :aria-label="$t('aria.refreshSourceCode')"
          :disabled="!contractHash || isLoading"
          @click="loadSourceCode"
        >
          {{ isLoading ? "Refreshing..." : "Refresh" }}
        </button>
      </div>
    </div>

    <ErrorState
      v-if="loadError"
      :title="$t('errorTitles.unableToLoadSource')"
      :message="$t('emptyMessages.tryAgainMoment')"
      @retry="loadSourceCode"
    />

    <EmptyState
      v-else-if="!contractHash"
      :message="$t('emptyMessages.noContractSelected')"
      :description="$t('inline.contractHashHintForSource')"
    />

    <div v-else-if="isLoading" class="space-y-4">
      <Skeleton v-for="index in 3" :key="index" height="280px" variant="rounded" />
    </div>

    <EmptyState
      v-else-if="!sourceCodeList.length"
      :message="$t('emptyMessages.noVerifiedSource')"
      :description="$t('inline.contractMayNotBeVerified')"
    />

    <div v-else class="space-y-4">
      <article v-for="(item, index) in sourceCodeList" :key="`${item.filename}-${index}`" :class="fileCardClass">
        <header class="soft-divider flex items-center justify-between border-b px-4 py-3">
          <h2 class="text-high truncate text-sm font-semibold">
            {{ item.filename || `File ${index + 1}` }}
          </h2>
          <CopyButton :text="item.code || ''" size="sm" />
        </header>

        <div
          class="overflow-auto"
          style="background: color-mix(in srgb, var(--surface-hover) 78%, transparent)"
          :style="viewerHeightStyle(item.code)"
        >
          <pre
            class="text-high min-h-full p-4 text-xs leading-5"
          ><code class="font-mono whitespace-pre">{{ item.code || "" }}</code></pre>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { rpc } from "@/services";
import { truncateHash } from "@/utils/explorerFormat";
import { normalizeUpdateCounter } from "@/utils/detailRouting";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import CopyButton from "@/components/common/CopyButton.vue";

const props = defineProps({
  contractHash: {
    type: String,
    default: "",
  },
  updatecounter: {
    type: [Number, String],
    default: 0,
  },
  showToolbar: {
    type: Boolean,
    default: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const sourceCodeList = ref([]);
const totalCount = ref(0);
const isLoading = ref(false);
const loadError = ref(false);

const safeUpdateCounter = computed(() => normalizeUpdateCounter(props.updatecounter));

const fileCardClass = computed(() => {
  if (props.compact) {
    return "panel-muted overflow-hidden rounded-md shadow-card";
  }
  return "panel-muted overflow-hidden rounded-lg shadow-card";
});

async function fetchIfReady() {
  if (!props.contractHash) {
    sourceCodeList.value = [];
    totalCount.value = 0;
    loadError.value = false;
    return;
  }
  await loadSourceCode();
}

async function loadSourceCode() {
  if (!props.contractHash) {
    return;
  }

  isLoading.value = true;
  loadError.value = false;

  try {
    // Suppress dev console.error for the common "unverified contract" case —
    // the failure is handled gracefully via loadError.value below, and the
    // noise drowns out real errors when browsing standard NEP-17 tokens.
    const result = await rpc("GetSourceCodeByContractHash", {
      ContractHash: props.contractHash,
      updatecounter: safeUpdateCounter.value,
    }, { suppressLog: true });

    sourceCodeList.value = Array.isArray(result?.result) ? result.result : [];
    totalCount.value = Number(result?.totalCount || sourceCodeList.value.length || 0);
  } catch (_error) {
    sourceCodeList.value = [];
    totalCount.value = 0;
    loadError.value = true;
  } finally {
    isLoading.value = false;
  }
}

function viewerHeightStyle(code) {
  const lineCount = String(code || "").split("\n").length;
  return { height: `${Math.min(640, Math.max(220, lineCount * 18))}px` };
}

watch(() => props.contractHash, fetchIfReady);
watch(() => props.updatecounter, fetchIfReady);

// equivalent of created() hook -- runs synchronously during setup
fetchIfReady();
</script>
