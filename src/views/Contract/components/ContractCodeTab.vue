<template>
  <div class="space-y-6">
    <div
      class="surface-panel flex flex-col gap-3 rounded-xl p-3 md:flex-row md:items-center md:justify-between"
    >
      <p class="text-mid text-sm">{{ $t("contractDetail.codeIntro") }}</p>
      <router-link
        :to="sourceCodeLocation"
        class="btn-outline inline-flex items-center justify-center px-3 py-2 text-sm font-semibold"
      >
        {{ $t("contractDetail.codeOpenFullPage") }}
      </router-link>
    </div>

    <ContractSourceCodePanel
      :key="`source-${contractHash}-${updateCounter}`"
      :contract-hash="contractHash"
      :updatecounter="updateCounter"
      :show-toolbar="true"
      :compact="true"
    />

    <section class="panel-muted overflow-hidden rounded-lg">
      <header class="soft-divider flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="text-high text-sm font-semibold">{{ $t("contractDetail.decompiledTitle") }}</h3>
          <p class="text-mid mt-1 text-xs">{{ $t("contractDetail.decompiledDescription") }}</p>
        </div>
        <CopyButton v-if="decompiledCode" :text="decompiledCode" size="sm" />
      </header>

      <div v-if="decompileLoading" class="p-4">
        <div class="h-5 w-44 animate-pulse rounded bg-surface-muted"></div>
        <div class="mt-3 h-40 animate-pulse rounded bg-surface-muted"></div>
      </div>

      <div v-else-if="decompileError" class="px-4 py-5 text-sm text-red-600 dark:text-red-400" role="alert">
        {{ decompileError }}
      </div>

      <div v-else-if="!decompiledCode" class="text-mid px-4 py-5 text-sm">
        {{ $t("contractDetail.decompiledUnavailable") }}
      </div>

      <div v-else>
        <div
          v-if="decompileWarnings.length"
          class="soft-divider border-b px-4 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          {{ $t("contractDetail.decompileWarnings", { count: decompileWarnings.length }) }}
        </div>
        <div class="max-h-[42rem] overflow-auto bg-gray-950">
          <pre class="m-0 p-4 text-xs leading-5 text-gray-100"><code
            data-test="decompiled-code"
            class="hljs language-csharp font-mono whitespace-pre"
            v-html="highlightedDecompiledCode"
          ></code></pre>
        </div>
      </div>
    </section>

    <div v-if="!manifest" class="panel-muted text-mid px-4 py-5 text-sm">
      {{ $t("contractDetail.codeManifestUnavailable") }}
    </div>

    <!-- Supported Standards Collapsible -->
    <CollapsibleSection
      v-if="supportedStandards.length"
      :title="$t('contractDetail.codeStandardsTitle')"
      :default-open="false"
    >
      <div class="flex flex-wrap gap-2 pt-3">
        <span
          v-for="std in supportedStandards"
          :key="'cs-' + std"
          class="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium"
          :class="nepBadgeClass(std)"
          :title="nepTooltip(std)"
        >
          {{ std }}
        </span>
      </div>
    </CollapsibleSection>
    <div v-else-if="manifest" class="panel-muted text-mid px-4 py-5 text-sm">
      {{ $t("contractDetail.codeStandardsEmpty") }}
    </div>

    <!-- ABI Browser Collapsible -->
    <CollapsibleSection v-if="manifest" :title="$t('contractDetail.codeAbiTitle')" :default-open="true">
      <template #title-suffix>
        <span class="text-mid ml-2 text-xs font-normal">
          {{ $t("contractDetail.codeAbiCount", { methods: abiMethods.length, events: abiEvents.length }) }}
        </span>
      </template>
      <!-- Methods -->
      <div v-if="abiMethods.length" class="p-4">
        <h4 class="text-low mb-3 text-xs font-semibold uppercase tracking-wider">
          {{ $t("contractDetail.codeAbiMethods") }}
        </h4>
        <div class="overflow-x-auto rounded-lg border soft-divider">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th scope="col" class="px-4 py-3">{{ $t("contractDetail.codeColName") }}</th>
                <th scope="col" class="px-4 py-3">{{ $t("contractDetail.codeColParameters") }}</th>
                <th scope="col" class="px-4 py-3">{{ $t("contractDetail.codeColReturnType") }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ $t("contractDetail.codeColSafe") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y soft-divider">
              <tr
                v-for="method in abiMethods"
                :key="'abi-m-' + method.name"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="px-4 py-3 font-mono text-high font-medium">{{ method.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-mid">
                  <div v-if="!method.parameters || method.parameters.length === 0" class="text-low italic">{{ $t("contractDetail.codeNone") }}</div>
                  <div v-else class="flex flex-col gap-1">
                    <span v-for="(p, i) in method.parameters" :key="i">
                      {{ p.name }}: <span class="text-emerald-600 dark:text-emerald-400">{{ p.type }}</span>{{ i < method.parameters.length - 1 ? ',' : '' }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">{{ method.returntype || $t("contractDetail.codeReturnVoid") }}</td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="rounded px-2 py-1 text-[10px] font-semibold uppercase"
                    :class="
                      method.safe
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    "
                  >
                    {{ method.safe ? $t("contractDetail.codeMethodSafe") : $t("contractDetail.codeMethodUnsafe") }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Events -->
      <div v-if="abiEvents.length" class="soft-divider border-t p-4">
        <h4 class="text-low mb-3 text-xs font-semibold uppercase tracking-wider">
          {{ $t("contractDetail.codeAbiEvents") }}
        </h4>
        <div class="overflow-x-auto rounded-lg border soft-divider">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th scope="col" class="px-4 py-3">{{ $t("contractDetail.codeColName") }}</th>
                <th scope="col" class="px-4 py-3">{{ $t("contractDetail.codeColParameters") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y soft-divider">
              <tr
                v-for="evt in abiEvents"
                :key="'abi-e-' + evt.name"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="px-4 py-3 font-mono text-high font-medium">{{ evt.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-mid">
                  <div v-if="!evt.parameters || evt.parameters.length === 0" class="text-low italic">{{ $t("contractDetail.codeNone") }}</div>
                  <div v-else class="flex flex-col gap-1">
                    <span v-for="(p, i) in evt.parameters" :key="i">
                      {{ p.name }}: <span class="text-emerald-600 dark:text-emerald-400">{{ p.type }}</span>{{ i < evt.parameters.length - 1 ? ',' : '' }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Permissions Collapsible -->
    <CollapsibleSection
      v-if="manifest && manifest.permissions && manifest.permissions.length"
      :title="$t('contractDetail.codePermissionsTitle')"
      :default-open="false"
    >
      <div class="soft-divider divide-y">
        <div
          v-for="(perm, idx) in manifest.permissions"
          :key="'perm-' + idx"
          class="flex flex-col gap-1 p-4 md:flex-row md:items-center md:gap-4"
        >
          <span class="text-high font-mono text-sm">
            {{ perm.contract || "*" }}
          </span>
          <span class="text-mid text-xs">
            {{
              $t("contractDetail.codePermissionsMethods", {
                value: Array.isArray(perm.methods) ? perm.methods.join(", ") : "*",
              })
            }}
          </span>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Groups Collapsible -->
    <CollapsibleSection
      v-if="manifest && manifest.groups && manifest.groups.length"
      :title="$t('contractDetail.codeGroupsTitle')"
      :default-open="false"
    >
      <div class="soft-divider divide-y">
        <div
          v-for="(group, idx) in manifest.groups"
          :key="'group-' + idx"
          class="p-4"
        >
          <div class="text-high font-mono text-sm font-medium">
            {{ $t("contractDetail.codeGroupsPubkey", { value: group.pubkey }) }}
          </div>
          <div class="text-mid mt-1 font-mono text-xs">
            {{ $t("contractDetail.codeGroupsSignature", { value: group.signature }) }}
          </div>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Trusts Collapsible -->
    <CollapsibleSection
      v-if="manifest && manifest.trusts && manifest.trusts.length"
      :title="$t('contractDetail.codeTrustsTitle')"
      :default-open="false"
    >
      <div class="p-4 flex flex-wrap gap-2">
        <span
          v-for="(trust, idx) in manifest.trusts"
          :key="'trust-' + idx"
          class="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        >
          {{ trust }}
        </span>
      </div>
    </CollapsibleSection>

    <!-- Features Collapsible -->
    <CollapsibleSection
      v-if="manifest && manifest.features && Object.keys(manifest.features).length"
      :title="$t('contractDetail.codeFeaturesTitle')"
      :default-open="false"
    >
      <div class="p-4">
        <ContractJsonView :json="manifest.features" />
      </div>
    </CollapsibleSection>

    <!-- Contract Manifest JSON Collapsible -->
    <CollapsibleSection v-if="manifest" :title="$t('contractDetail.codeManifestTitle')" :default-open="false">
      <div class="max-h-96 overflow-auto p-4">
        <ContractJsonView :json="manifest" />
      </div>
    </CollapsibleSection>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import "highlight.js/styles/github-dark.css";
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
import ContractSourceCodePanel from "@/components/contract/ContractSourceCodePanel.vue";
import ContractJsonView from "@/views/Contract/ContractJsonView.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import { decompileContractState } from "@/utils/contractDecompiler";
import { nepBadgeClass, nepTooltip } from "@/utils/nepBadges";

const props = defineProps({
  contractHash: { type: String, required: true },
  updateCounter: { type: Number, default: 0 },
  sourceCodeLocation: { type: [String, Object], required: true },
  manifest: { type: Object, default: null },
  supportedStandards: { type: Array, default: () => [] },
  contractState: { type: Object, default: null },
});

const decompiledCode = ref("");
const highlightedDecompiledCode = ref("");
const decompileWarnings = ref([]);
const decompileError = ref("");
const decompileLoading = ref(false);
let decompileGeneration = 0;
let highlighter = null;
let highlighterPromise = null;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadHighlighter() {
  if (highlighter) return highlighter;
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import("highlight.js/lib/core"),
      import("highlight.js/lib/languages/csharp"),
    ]).then(([coreMod, csharpMod]) => {
      const runtime = coreMod.default;
      runtime.registerLanguage("csharp", csharpMod.default);
      highlighter = runtime;
      return runtime;
    });
  }
  return highlighterPromise;
}

async function updateHighlightedCode(code) {
  highlightedDecompiledCode.value = escapeHtml(code);
  try {
    const runtime = await loadHighlighter();
    highlightedDecompiledCode.value = runtime.highlight(code, { language: "csharp", ignoreIllegals: true }).value;
  } catch {
    highlightedDecompiledCode.value = escapeHtml(code);
  }
}

async function refreshDecompiledCode() {
  const generation = ++decompileGeneration;
  decompileError.value = "";
  decompiledCode.value = "";
  highlightedDecompiledCode.value = "";
  decompileWarnings.value = [];

  if (!props.contractState?.nef) {
    decompileLoading.value = false;
    return;
  }

  decompileLoading.value = true;
  try {
    const result = await decompileContractState(props.contractState, props.manifest);
    if (generation !== decompileGeneration) return;
    decompiledCode.value = result.code || "";
    decompileWarnings.value = result.warnings || [];
    await updateHighlightedCode(decompiledCode.value);
  } catch (err) {
    if (generation !== decompileGeneration) return;
    decompileError.value = err?.message || "Failed to decompile contract.";
  } finally {
    if (generation === decompileGeneration) decompileLoading.value = false;
  }
}

// Computed - manifest-derived ABI data
const abiMethods = computed(() => {
  const abi = props.manifest?.abi;
  return abi && Array.isArray(abi.methods) ? abi.methods : [];
});

const abiEvents = computed(() => {
  const abi = props.manifest?.abi;
  return abi && Array.isArray(abi.events) ? abi.events : [];
});

watch(
  () => [props.contractHash, props.updateCounter, props.contractState?.nef, props.manifest],
  () => {
    refreshDecompiledCode();
  },
  { immediate: true }
);
</script>
