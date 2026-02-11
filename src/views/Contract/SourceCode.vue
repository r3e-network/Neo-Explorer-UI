<template>
  <div class="source-code-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb
        :items="[
          { label: 'Home', to: '/homepage' },
          { label: 'Contracts', to: '/contracts/1' },
          { label: 'Source Code' },
        ]"
      />

      <!-- Page Header -->
      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-text-primary dark:text-gray-100">Verified Source Code</h1>
          <p class="text-sm text-text-secondary dark:text-gray-400">
            Browse verified contract source files and compare with deployed bytecode.
          </p>
        </div>
      </div>

      <div class="etherscan-card">
        <div class="p-4 md:p-6">
          <ContractSourceCodePanel
            :contract-hash="resolvedContractHash"
            :updatecounter="resolvedUpdateCounter"
            :show-toolbar="true"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import ContractSourceCodePanel from "@/components/contract/ContractSourceCodePanel.vue";
import { normalizeUpdateCounter } from "@/utils/detailRouting";

const route = useRoute();

const props = defineProps({
  contractHash: {
    type: String,
    default: "",
  },
  updatecounter: {
    type: [Number, String],
    default: 0,
  },
});

const resolvedContractHash = computed(() => {
  return props.contractHash || route.query.contractHash || "";
});

const resolvedUpdateCounter = computed(() => {
  return normalizeUpdateCounter(props.updatecounter || route.query.updatecounter || 0);
});
</script>
