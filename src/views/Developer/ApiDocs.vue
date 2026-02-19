<template>
  <div class="api-docs">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
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
          <p class="page-subtitle">
            JSON-RPC methods used by this explorer on <span class="font-medium">{{ networkLabel }}</span>
          </p>
        </div>
      </div>

      <div class="mb-4 rounded-lg border border-card-border bg-card px-4 py-3 text-sm dark:border-card-border-dark">
        <p class="text-text-secondary dark:text-gray-300">
          Endpoint:
          <span class="font-mono text-text-primary dark:text-gray-100">POST {{ rpcBasePath }}</span>
        </p>
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
              <span
                class="rounded px-2 py-0.5 text-xs font-semibold"
                :class="
                  method.type === 'passthrough'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                "
              >
                {{ method.type === "passthrough" ? "Native Pass-through" : "Indexed API" }}
              </span>
              <h3 class="font-mono text-sm font-semibold text-text-primary dark:text-gray-100">
                {{ method.name }}
              </h3>
            </div>

            <p class="mb-3 text-sm text-text-secondary dark:text-gray-400">
              {{ method.desc }}
            </p>

            <pre
              class="overflow-x-auto rounded border border-card-border bg-gray-50 p-3 text-xs text-text-primary dark:border-card-border-dark dark:bg-gray-800 dark:text-gray-200"
            ><code>{{ buildRequestBody(method) }}</code></pre>
          </article>
        </main>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { API_DOCS_RPC_CATEGORIES, API_DOCS_RPC_METHODS } from "@/constants/rpcApiDocs.mjs";
import { getCurrentEnv, getNetworkLabel, getRpcApiBasePath } from "@/utils/env";

const categories = API_DOCS_RPC_CATEGORIES;
const methods = API_DOCS_RPC_METHODS;
const activeCategory = ref(categories[0]?.key || "");
const networkLabel = computed(() => getNetworkLabel(getCurrentEnv()));
const rpcBasePath = computed(() => getRpcApiBasePath());

const filteredMethods = computed(() => methods.filter((method) => method.category === activeCategory.value));

function buildRequestBody(method) {
  return JSON.stringify(
    {
      jsonrpc: "2.0",
      id: 1,
      method: method.name,
      params: method.params,
    },
    null,
    2
  );
}
</script>
