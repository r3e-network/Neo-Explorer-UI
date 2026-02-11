<template>
  <div class="source-code-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6">
      <nav class="mb-4 flex items-center text-sm text-text-secondary dark:text-gray-400">
        <router-link to="/homepage" class="hover:text-primary-500">Home</router-link>
        <span class="mx-2">/</span>
        <router-link to="/contracts/1" class="hover:text-primary-500">Contracts</router-link>
        <span class="mx-2">/</span>
        <span class="text-text-primary dark:text-gray-300">Source Code</span>
      </nav>

      <div class="etherscan-card">
        <header class="border-b border-card-border p-5 dark:border-card-border-dark md:p-6">
          <h1 class="text-xl font-semibold text-text-primary dark:text-gray-100">Verified Source Code</h1>
          <p class="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Browse verified contract source files and compare with deployed bytecode.
          </p>
        </header>

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
