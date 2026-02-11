<template>
  <div>
    <div
      v-if="showToolbar"
      class="mb-4 flex flex-col gap-3 rounded-md border border-card-border bg-gray-50 p-3 dark:border-card-border-dark dark:bg-gray-900/40 md:flex-row md:items-center md:justify-between"
    >
      <div class="text-sm text-text-secondary dark:text-gray-400">
        <span v-if="contractHash"> Contract: {{ truncateHash(contractHash, 14, 10) }} </span>
        <span v-else>Provide a contract hash to load source files.</span>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-secondary dark:bg-gray-800 dark:text-gray-300"
        >
          Files: {{ totalCount }}
        </span>
        <button
          class="rounded border border-card-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label="Refresh source code"
          :disabled="!contractHash || isLoading"
          @click="loadSourceCode"
        >
          {{ isLoading ? "Refreshing..." : "Refresh" }}
        </button>
      </div>
    </div>

    <ErrorState
      v-if="loadError"
      title="Unable to load source code"
      message="Please try again in a moment."
      @retry="loadSourceCode"
    />

    <EmptyState
      v-else-if="!contractHash"
      message="No contract selected"
      description="Provide a valid contract hash to inspect verified source files."
    />

    <div v-else-if="isLoading" class="space-y-4">
      <Skeleton v-for="index in 3" :key="index" height="280px" variant="rounded" />
    </div>

    <EmptyState
      v-else-if="!sourceCodeList.length"
      message="No verified source code found"
      description="This contract may not be verified yet."
    />

    <div v-else class="space-y-4">
      <article v-for="(item, index) in sourceCodeList" :key="`${item.filename}-${index}`" :class="fileCardClass">
        <header class="border-b border-card-border px-4 py-3 dark:border-card-border-dark">
          <h2 class="truncate text-sm font-semibold text-text-primary dark:text-gray-100">
            {{ item.filename || `File ${index + 1}` }}
          </h2>
        </header>

        <v-ace-editor
          :value="item.code || ''"
          lang="text"
          theme="chrome"
          :readonly="true"
          :options="editorOptions"
          :style="{ height: editorHeight(item.code) }"
        />
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { VAceEditor } from "vue3-ace-editor";
import { rpc } from "@/services";
import { truncateHash } from "@/utils/explorerFormat";
import { normalizeUpdateCounter } from "@/utils/detailRouting";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import "ace-builds/src-noconflict/mode-text";
import "ace-builds/src-noconflict/theme-chrome";

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
const editorOptions = {
  enableBasicAutocompletion: true,
  enableSnippets: true,
  showPrintMargin: false,
};

const safeUpdateCounter = computed(() => normalizeUpdateCounter(props.updatecounter));

const fileCardClass = computed(() => {
  if (props.compact) {
    return "overflow-hidden rounded-md border border-card-border bg-white shadow-card dark:border-card-border-dark dark:bg-gray-800";
  }
  return "overflow-hidden rounded-lg border border-card-border bg-white shadow-card dark:border-card-border-dark dark:bg-gray-800";
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
    const result = await rpc("GetSourceCodeByContractHash", {
      ContractHash: props.contractHash,
      updatecounter: safeUpdateCounter.value,
    });

    sourceCodeList.value = Array.isArray(result?.result) ? result.result : [];
    totalCount.value = Number(result?.totalCount || sourceCodeList.value.length || 0);
  } catch (error) {
    sourceCodeList.value = [];
    totalCount.value = 0;
    loadError.value = true;
  } finally {
    isLoading.value = false;
  }
}

function editorHeight(code) {
  const lineCount = String(code || "").split("\n").length;
  return `${Math.min(640, Math.max(220, lineCount * 18))}px`;
}

watch(() => props.contractHash, fetchIfReady);
watch(() => props.updatecounter, fetchIfReady);

// equivalent of created() hook -- runs synchronously during setup
fetchIfReady();
</script>
