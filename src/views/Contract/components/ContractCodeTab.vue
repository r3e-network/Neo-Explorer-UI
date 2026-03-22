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
        <h4 class="text-low mb-3 text-xs font-semibold uppercase tracking-wider">
          Methods
        </h4>
        <div class="overflow-x-auto rounded-lg border soft-divider">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th scope="col" class="px-4 py-3">Name</th>
                <th scope="col" class="px-4 py-3">Parameters</th>
                <th scope="col" class="px-4 py-3">Return Type</th>
                <th scope="col" class="px-4 py-3 text-center">Safe</th>
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
                  <div v-if="!method.parameters || method.parameters.length === 0" class="text-low italic">None</div>
                  <div v-else class="flex flex-col gap-1">
                    <span v-for="(p, i) in method.parameters" :key="i">
                      {{ p.name }}: <span class="text-emerald-600 dark:text-emerald-400">{{ p.type }}</span>{{ i < method.parameters.length - 1 ? ',' : '' }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">{{ method.returntype || 'Void' }}</td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="rounded px-2 py-1 text-[10px] font-semibold uppercase"
                    :class="
                      method.safe
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    "
                  >
                    {{ method.safe ? "Safe" : "Unsafe" }}
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
          Events
        </h4>
        <div class="overflow-x-auto rounded-lg border soft-divider">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th scope="col" class="px-4 py-3">Name</th>
                <th scope="col" class="px-4 py-3">Parameters</th>
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
                  <div v-if="!evt.parameters || evt.parameters.length === 0" class="text-low italic">None</div>
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

    <!-- Groups Collapsible -->
    <CollapsibleSection
      v-if="manifest && manifest.groups && manifest.groups.length"
      title="Groups"
      :default-open="false"
    >
      <div class="soft-divider divide-y">
        <div
          v-for="(group, idx) in manifest.groups"
          :key="'group-' + idx"
          class="p-4"
        >
          <div class="text-high font-mono text-sm font-medium">PubKey: {{ group.pubkey }}</div>
          <div class="text-mid mt-1 font-mono text-xs">Signature: {{ group.signature }}</div>
        </div>
      </div>
    </CollapsibleSection>

    <!-- Trusts Collapsible -->
    <CollapsibleSection
      v-if="manifest && manifest.trusts && manifest.trusts.length"
      title="Trusts"
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
      title="Features"
      :default-open="false"
    >
      <div class="p-4">
        <ContractJsonView :json="manifest.features" />
      </div>
    </CollapsibleSection>

    <!-- Contract Manifest JSON Collapsible -->
    <CollapsibleSection v-if="manifest" title="Contract Manifest" :default-open="false">
      <div class="max-h-96 overflow-auto p-4">
        <ContractJsonView :json="manifest" />
      </div>
    </CollapsibleSection>
  </div>
</template>

<script setup>
import { computed } from "vue";
import CollapsibleSection from "@/components/common/CollapsibleSection.vue";
import ContractSourceCodePanel from "@/components/contract/ContractSourceCodePanel.vue";
import ContractJsonView from "@/views/Contract/ContractJsonView.vue";
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
