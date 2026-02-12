<template>
  <div class="api-docs">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <!-- Breadcrumb -->
      <Breadcrumb :items="[{ label: 'Home', to: '/homepage' }, { label: 'API Documentation' }]" />

      <div class="mb-6 flex items-center gap-3">
        <div class="page-header-icon bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <div>
          <h1 class="page-title">API Documentation</h1>
          <p class="page-subtitle">Neo N3 Explorer API reference and endpoints</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <aside class="etherscan-card p-4">
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-text-primary dark:text-gray-100">
            Categories
          </h2>
          <nav class="space-y-1">
            <button
              v-for="category in categories"
              :key="category.key"
              class="w-full rounded px-3 py-2 text-left text-sm transition-colors"
              :class="
                activeCategory === category.key
                  ? 'bg-primary-50 text-primary-500 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-text-secondary hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              "
              @click="activeCategory = category.key"
            >
              {{ category.label }}
            </button>
          </nav>
        </aside>

        <main class="space-y-3 lg:col-span-3">
          <article v-for="method in filteredMethods" :key="method.name" class="etherscan-card p-5">
            <div class="mb-2 flex items-center gap-2">
              <span
                class="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300"
                >RPC</span
              >
              <h3 class="font-mono text-sm font-semibold text-text-primary dark:text-gray-100">
                {{ method.name }}
              </h3>
            </div>
            <p class="mb-3 text-sm text-text-secondary dark:text-gray-400">
              {{ method.desc }}
            </p>
            <div
              class="rounded border border-card-border bg-gray-50 p-3 font-mono text-sm text-text-primary dark:border-card-border-dark dark:bg-gray-800 dark:text-gray-200"
            >
              /api/{{ method.endpoint }}
            </div>
          </article>
        </main>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";

const activeCategory = ref("blocks");

const categories = [
  { key: "blocks", label: "Blocks" },
  { key: "transactions", label: "Transactions" },
  { key: "addresses", label: "Addresses" },
  { key: "contracts", label: "Contracts" },
];

const methods = [
  {
    name: "GetBlockCount",
    endpoint: "blocks/count",
    desc: "Get current block height",
    category: "blocks",
  },
  {
    name: "GetBlockByHash",
    endpoint: "blocks/{hash}",
    desc: "Get block by hash",
    category: "blocks",
  },
  {
    name: "GetTransactionList",
    endpoint: "transactions",
    desc: "Get transaction list",
    category: "transactions",
  },
  {
    name: "GetTransactionByHash",
    endpoint: "transactions/{hash}",
    desc: "Get transaction by hash",
    category: "transactions",
  },
  {
    name: "GetAddressInfo",
    endpoint: "addresses/{address}",
    desc: "Get address info",
    category: "addresses",
  },
  {
    name: "GetContractInfo",
    endpoint: "contracts/{hash}",
    desc: "Get contract info",
    category: "contracts",
  },
];

const filteredMethods = computed(() => {
  return methods.filter((method) => method.category === activeCategory.value);
});
</script>
