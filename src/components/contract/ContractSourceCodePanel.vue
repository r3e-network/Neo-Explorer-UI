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

<script>
import { VAceEditor } from "vue3-ace-editor";
import { rpc } from "@/services";
import { truncateHash } from "@/utils/explorerFormat";
import { normalizeUpdateCounter } from "@/utils/detailRouting";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import "ace-builds/src-noconflict/mode-text";
import "ace-builds/src-noconflict/theme-chrome";

export default {
  name: "ContractSourceCodePanel",
  components: {
    VAceEditor,
    EmptyState,
    ErrorState,
    Skeleton,
  },
  props: {
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
  },
  data() {
    return {
      sourceCodeList: [],
      totalCount: 0,
      isLoading: false,
      loadError: false,
      editorOptions: {
        enableBasicAutocompletion: true,
        enableSnippets: true,
        showPrintMargin: false,
      },
    };
  },
  computed: {
    safeUpdateCounter() {
      return normalizeUpdateCounter(this.updatecounter);
    },
    fileCardClass() {
      if (this.compact) {
        return "overflow-hidden rounded-md border border-card-border bg-white shadow-card dark:border-card-border-dark dark:bg-gray-800";
      }

      return "overflow-hidden rounded-lg border border-card-border bg-white shadow-card dark:border-card-border-dark dark:bg-gray-800";
    },
  },
  watch: {
    contractHash: "fetchIfReady",
    updatecounter: "fetchIfReady",
  },
  created() {
    this.fetchIfReady();
  },
  methods: {
    async fetchIfReady() {
      if (!this.contractHash) {
        this.sourceCodeList = [];
        this.totalCount = 0;
        this.loadError = false;
        return;
      }

      await this.loadSourceCode();
    },

    async loadSourceCode() {
      if (!this.contractHash) {
        return;
      }

      this.isLoading = true;
      this.loadError = false;

      try {
        const result = await rpc("GetSourceCodeByContractHash", {
          ContractHash: this.contractHash,
          updatecounter: this.safeUpdateCounter,
        });

        this.sourceCodeList = Array.isArray(result?.result) ? result.result : [];
        this.totalCount = Number(result?.totalCount || this.sourceCodeList.length || 0);
      } catch (error) {
        this.sourceCodeList = [];
        this.totalCount = 0;
        this.loadError = true;
      } finally {
        this.isLoading = false;
      }
    },

    editorHeight(code) {
      const lineCount = String(code || "").split("\n").length;
      return `${Math.min(640, Math.max(220, lineCount * 18))}px`;
    },

    truncateHash,
  },
};
</script>
