<template>
  <div>
    <div
      v-if="showToolbar"
      class="panel-muted mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between"
    >
      <div class="text-mid text-sm">
        <span v-if="contractHash"> Contract: {{ truncateHash(contractHash, 14, 10) }} </span>
        <span v-else>{{ $t('inline.provideContractHash') }}</span>
        <a
          v-if="externalSourceUrl"
          :href="externalSourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="etherscan-link ml-2 break-all"
        >
          Manifest Source
        </a>
      </div>

      <div class="flex items-center gap-2">
        <span class="badge-soft rounded-full px-3 py-1"> Files: {{ totalCount }} </span>
        <button
          class="btn-outline px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          :aria-label="$t('aria.refreshSourceCode')"
          :disabled="!canLoadSource || isLoading"
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
      v-else-if="!canLoadSource"
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
          <pre class="text-high min-h-full p-4 text-xs leading-5"><code
            class="hljs font-mono whitespace-pre"
            :class="`language-${item.language || 'plaintext'}`"
            v-html="item.highlightedCode"
          ></code></pre>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import "highlight.js/styles/github-dark.css";
import { truncateHash } from "@/utils/explorerFormat";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Skeleton from "@/components/common/Skeleton.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { fetchExternalContractSource } from "@/utils/contractSource";

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
  externalSourceUrl: {
    type: String,
    default: "",
  },
});

const sourceCodeList = ref([]);
const totalCount = ref(0);
const isLoading = ref(false);
const loadError = ref(false);
let highlighter = null;
let highlighterPromise = null;

const fileCardClass = computed(() => {
  if (props.compact) {
    return "panel-muted overflow-hidden rounded-md shadow-card";
  }
  return "panel-muted overflow-hidden rounded-lg shadow-card";
});
const canLoadSource = computed(() => Boolean(props.contractHash || props.externalSourceUrl));

async function fetchIfReady() {
  if (!canLoadSource.value) {
    sourceCodeList.value = [];
    totalCount.value = 0;
    loadError.value = false;
    return;
  }
  await loadSourceCode();
}

async function loadSourceCode() {
  if (!canLoadSource.value) {
    return;
  }

  isLoading.value = true;
  loadError.value = false;

  try {
    if (props.externalSourceUrl) {
      const externalFiles = await fetchExternalContractSource(props.externalSourceUrl);
      sourceCodeList.value = await highlightSourceFiles(externalFiles);
      totalCount.value = sourceCodeList.value.length;
      if (sourceCodeList.value.length) return;
    }

    // Verified source files were stored behind the legacy Mongo RPC handler.
    // After Phase 2e that handler is retired, so this panel degrades to the
    // existing empty state until a Postgres-backed source-code API exists.
    sourceCodeList.value = [];
    totalCount.value = 0;
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

async function highlightSourceFiles(files) {
  return Promise.all(
    files.map(async (item) => ({
      ...item,
      highlightedCode: await highlightCode(item.code, item.language),
    })),
  );
}

async function highlightCode(code = "", language = "plaintext") {
  const escaped = escapeHtml(code);
  if (!code || language === "plaintext") return escaped;
  try {
    const runtime = await loadHighlighter();
    return runtime.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return escaped;
  }
}

async function loadHighlighter() {
  if (highlighter) return highlighter;
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import("highlight.js/lib/core"),
      import("highlight.js/lib/languages/csharp"),
      import("highlight.js/lib/languages/xml"),
      import("highlight.js/lib/languages/json"),
      import("highlight.js/lib/languages/python"),
      import("highlight.js/lib/languages/go"),
      import("highlight.js/lib/languages/java"),
      import("highlight.js/lib/languages/javascript"),
      import("highlight.js/lib/languages/typescript"),
      import("highlight.js/lib/languages/rust"),
      import("highlight.js/lib/languages/markdown"),
      import("highlight.js/lib/languages/yaml"),
    ]).then(([coreMod, csharp, xml, json, python, go, java, javascript, typescript, rust, markdown, yaml]) => {
      const runtime = coreMod.default;
      [
        ["csharp", csharp.default],
        ["xml", xml.default],
        ["json", json.default],
        ["python", python.default],
        ["go", go.default],
        ["java", java.default],
        ["javascript", javascript.default],
        ["typescript", typescript.default],
        ["rust", rust.default],
        ["markdown", markdown.default],
        ["yaml", yaml.default],
      ].forEach(([name, language]) => {
        if (!runtime.getLanguage(name)) runtime.registerLanguage(name, language);
      });
      highlighter = runtime;
      return runtime;
    });
  }
  return highlighterPromise;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

watch(() => props.contractHash, fetchIfReady);
watch(() => props.updatecounter, fetchIfReady);
watch(() => props.externalSourceUrl, fetchIfReady);

// equivalent of created() hook -- runs synchronously during setup
fetchIfReady();
</script>
