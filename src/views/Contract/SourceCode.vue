<template>
  <div class="source-code-page">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8 animate-page-enter">
      <Breadcrumb
        :items="[
          { label: $t('breadcrumb.home'), to: '/homepage' },
          { label: $t('breadcrumb.contracts'), to: '/contracts/1' },
          { label: $t('breadcrumb.sourceCode') },
        ]"
      />

      <!-- Page Header -->
      <PageHero :particles="40">
        <div class="flex items-center gap-3">
          <div class="page-header-icon bg-icon-primary">
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
            <h1 class="page-title neon-glow-text">{{ $t("pages.sourceCode.title") }}</h1>
            <p class="page-subtitle">{{ $t("pages.sourceCode.subtitle") }}</p>
          </div>
        </div>
      </PageHero>

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
import PageHero from "@/components/common/PageHero.vue";
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
