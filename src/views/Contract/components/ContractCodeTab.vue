<template>
  <div class="space-y-6">
    <div
      class="flex flex-col gap-3 rounded-md border border-card-border bg-gray-50 p-3 dark:border-card-border-dark dark:bg-gray-800/40 md:flex-row md:items-center md:justify-between"
    >
      <p class="text-sm text-text-secondary dark:text-gray-300">Verified source files and contract artifacts.</p>
      <router-link
        :to="sourceCodeLocation"
        class="btn-outline inline-flex items-center justify-center rounded px-3 py-2 text-sm font-medium transition-colors"
      >
        Open Full Source Page
      </router-link>
    </div>

    <ContractSourceCodePanel
      :key="`source-${contractHash}-${updateCounter}`"
      :contract-hash="contractHash"
      :updatecounter="updateCounter"
      :show-toolbar="true"
      :compact="true"
    />

    <!-- Supported Standards Collapsible -->
    <CollapsibleSection v-if="supportedStandards.length" title="Supported Standards" :default-open="false">
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

    <!-- ABI Browser Collapsible -->
    <CollapsibleSection v-if="manifest" title="ABI Browser" :default-open="true">
      <template #title-suffix>
        <span class="ml-2 text-xs font-normal text-text-secondary dark:text-gray-400">
          ({{ abiMethods.length }} methods, {{ abiEvents.length }} events)
        </span>
      </template>
      <!-- Methods -->
      <div v-if="abiMethods.length" class="p-4">
        <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">
          Methods
        </h4>
        <div class="space-y-2">
          <div
            v-for="method in abiMethods"
            :key="'abi-m-' + method.name"
            class="rounded-md border border-card-border p-3 dark:border-card-border-dark"
          >
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">
                {{ method.name }}
              </span>
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                :class="
                  method.safe
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                "
              >
                {{ method.safe ? "Safe" : "Unsafe" }}
              </span>
            </div>
            <div class="mt-1 font-mono text-xs text-text-secondary dark:text-gray-400">
              ({{ (method.parameters || []).map((p) => p.name + ": " + p.type).join(", ") }})
              <span v-if="method.returntype"> &rarr; {{ method.returntype }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Events -->
      <div v-if="abiEvents.length" class="border-t border-card-border p-4 dark:border-card-border-dark">
        <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">
          Events
        </h4>
        <div class="space-y-2">
          <div
            v-for="evt in abiEvents"
            :key="'abi-e-' + evt.name"
            class="rounded-md border border-card-border p-3 dark:border-card-border-dark"
          >
            <span class="font-mono text-sm font-medium text-text-primary dark:text-gray-100">
              {{ evt.name }}
            </span>
            <div class="mt-1 font-mono text-xs text-text-secondary dark:text-gray-400">
              ({{ (evt.parameters || []).map((p) => p.name + ": " + p.type).join(", ") }})
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Permissions Collapsible -->
    <CollapsibleSection
      v-if="manifest && manifest.permissions && manifest.permissions.length"
      title="Permissions"
      :default-open="false"
    >
      <div class="divide-y divide-card-border dark:divide-card-border-dark">
        <div
          v-for="(perm, idx) in manifest.permissions"
          :key="'perm-' + idx"
          class="flex flex-col gap-1 p-4 md:flex-row md:items-center md:gap-4"
        >
          <span class="font-mono text-sm text-text-primary dark:text-gray-200">
            {{ perm.contract || "*" }}
          </span>
          <span class="text-xs text-text-secondary dark:text-gray-400">
            Methods: {{ Array.isArray(perm.methods) ? perm.methods.join(", ") : "*" }}
          </span>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Contract Manifest JSON Collapsible -->
    <CollapsibleSection v-if="manifest" title="Contract Manifest" :default-open="false">
      <pre class="max-h-96 overflow-auto p-4 font-mono text-xs text-text-primary dark:text-gray-200">{{
        JSON.stringify(manifest, null, 2)
      }}</pre>
    </CollapsibleSection>
  </div>
</template>

<script setup>
import { computed } from "vue";
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
import ContractSourceCodePanel from "@/components/contract/ContractSourceCodePanel.vue";
import { nepBadgeClass, nepTooltip } from "@/utils/nepBadges";

const props = defineProps({
  contractHash: { type: String, required: true },
  updateCounter: { type: Number, default: 0 },
  sourceCodeLocation: { type: [String, Object], required: true },
  manifest: { type: Object, default: null },
  supportedStandards: { type: Array, default: () => [] },
});

// Computed - manifest-derived ABI data
const abiMethods = computed(() => {
  const abi = props.manifest?.abi;
  return abi && Array.isArray(abi.methods) ? abi.methods : [];
});

const abiEvents = computed(() => {
  const abi = props.manifest?.abi;
  return abi && Array.isArray(abi.events) ? abi.events : [];
});
</script>
