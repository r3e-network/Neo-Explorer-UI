<template>
  <div class="space-y-6">
    <div
      class="surface-panel flex flex-col gap-3 rounded-xl p-3 md:flex-row md:items-center md:justify-between"
    >
      <p class="text-mid text-sm">Verified source files and contract artifacts.</p>
      <router-link
        :to="sourceCodeLocation"
        class="btn-outline inline-flex items-center justify-center px-3 py-2 text-sm font-semibold"
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

    <div v-if="!manifest" class="panel-muted text-mid px-4 py-5 text-sm">
      Contract manifest data is not available for this contract.
    </div>

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
    <div v-else-if="manifest" class="panel-muted text-mid px-4 py-5 text-sm">
      No supported standards detected.
    </div>

    <!-- ABI Browser Collapsible -->
    <CollapsibleSection v-if="manifest" title="ABI Browser" :default-open="true">
      <template #title-suffix>
        <span class="text-mid ml-2 text-xs font-normal">
          ({{ abiMethods.length }} methods, {{ abiEvents.length }} events)
        </span>
      </template>
      <!-- Methods -->
      <div v-if="abiMethods.length" class="p-4">
        <h4 class="text-low mb-2 text-xs font-semibold uppercase tracking-wider">
          Methods
        </h4>
        <div class="space-y-2">
          <div
            v-for="method in abiMethods"
            :key="'abi-m-' + method.name"
            class="rounded-lg border p-3 soft-divider"
          >
            <div class="flex items-center gap-2">
              <span class="text-high font-mono text-sm font-medium">
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
            <div class="text-mid mt-1 font-mono text-xs">
              ({{ (method.parameters || []).map((p) => p.name + ": " + p.type).join(", ") }})
              <span v-if="method.returntype"> &rarr; {{ method.returntype }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Events -->
      <div v-if="abiEvents.length" class="soft-divider border-t p-4">
        <h4 class="text-low mb-2 text-xs font-semibold uppercase tracking-wider">
          Events
        </h4>
        <div class="space-y-2">
          <div
            v-for="evt in abiEvents"
            :key="'abi-e-' + evt.name"
            class="rounded-lg border p-3 soft-divider"
          >
            <span class="text-high font-mono text-sm font-medium">
              {{ evt.name }}
            </span>
            <div class="text-mid mt-1 font-mono text-xs">
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
            Methods: {{ Array.isArray(perm.methods) ? perm.methods.join(", ") : "*" }}
          </span>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Contract Manifest JSON Collapsible -->
    <CollapsibleSection v-if="manifest" title="Contract Manifest" :default-open="false">
      <pre class="text-high max-h-96 overflow-auto p-4 font-mono text-xs">{{
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
