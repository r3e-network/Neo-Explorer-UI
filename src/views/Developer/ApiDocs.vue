<template>
  <div class="api-docs">
    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8">
      <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.apiDocs') }]" />

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
          <h1 class="page-title">{{ $t('apiDocsPage.title') }}</h1>
          <p class="page-subtitle">
            {{ $t('apiDocsPage.subtitleBefore') }} <span class="font-medium">{{ networkLabel }}</span>
          </p>
        </div>
      </div>

      <div class="panel-muted mb-4 px-4 py-3 text-sm">
        <p v-if="apiMode === 'rpc'" class="text-mid">
          {{ $t('apiDocsPage.endpointPrefix') }}
          <span class="text-high font-mono">POST {{ rpcBasePath }}</span>
        </p>
        <p v-else class="text-mid">
          {{ $t('apiDocsPage.endpointPrefix') }}
          <span class="text-high font-mono">GET https://api.n3index.dev/v1/networks/&#123;network&#125;/...</span>
        </p>
      </div>

      <!-- API mode switcher: REST (current) vs JSON-RPC (legacy) -->
      <div class="mb-4 flex gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="apiMode === 'rest' ? 'bg-blue-600 text-white' : 'bg-card text-mid hover:bg-card-hover'"
          @click="setApiMode('rest')"
        >
          {{ $t('apiDocsPage.modeRestRecommended') }}
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="apiMode === 'rpc' ? 'bg-blue-600 text-white' : 'bg-card text-mid hover:bg-card-hover'"
          @click="setApiMode('rpc')"
        >
          {{ $t('apiDocsPage.modeRpc') }}
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <aside class="etherscan-card p-4">
          <h2 class="text-high mb-3 text-sm font-semibold uppercase tracking-wide">
            {{ $t('apiDocsPage.categoriesHeading') }}
          </h2>
          <nav class="space-y-1" :aria-label="$t('apiDocsPage.categoriesAriaLabel')">
            <button
              v-for="category in categories"
              :key="category.key"
              type="button"
              class="tab-btn w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              :aria-pressed="activeCategory === category.key"
              :class="
                activeCategory === category.key
                  ? 'tab-btn-active'
                  : 'tab-btn-inactive'
              "
              @click="activeCategory = category.key"
            >
              {{ apiMode === 'rest' ? category.label : $t(`apiDocsPage.categories.${category.key}`) }}
            </button>
          </nav>
        </aside>

        <main class="space-y-3 lg:col-span-3">
          <!-- REST (Read API) mode -->
          <template v-if="apiMode === 'rest'">
            <article v-for="ep in filteredEndpoints" :key="ep.path" class="etherscan-card p-5">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span
                  class="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >{{ ep.method }}</span
                >
                <h3 class="text-high font-mono text-sm font-semibold break-all">{{ ep.path }}</h3>
              </div>
              <p class="text-mid mb-3 text-sm">{{ ep.desc }}</p>
              <div v-if="ep.pathParams && ep.pathParams.length" class="mb-2">
                <p class="text-low mb-1 text-xs font-semibold uppercase">Path params</p>
                <ul class="space-y-1">
                  <li v-for="p in ep.pathParams" :key="p.name" class="text-mid text-xs">
                    <span class="text-high font-mono">{{ p.name }}</span> — {{ p.desc }}
                  </li>
                </ul>
              </div>
              <div v-if="ep.queryParams && ep.queryParams.length" class="mb-2">
                <p class="text-low mb-1 text-xs font-semibold uppercase">Query params</p>
                <ul class="space-y-1">
                  <li v-for="p in ep.queryParams" :key="p.name" class="text-mid text-xs">
                    <span class="text-high font-mono">{{ p.name }}</span>
                    <span class="text-low"> ({{ p.type }})</span> — {{ p.desc }}
                  </li>
                </ul>
              </div>
              <pre
                class="font-hash text-high overflow-x-auto rounded border border-card-border bg-gray-50 p-3 text-xs leading-relaxed dark:border-card-border-dark dark:bg-gray-800 dark:text-gray-200"
              ><code>{{ ep.example }}</code></pre>
            </article>
            <div v-if="!filteredEndpoints.length" class="text-low panel-muted border-dashed px-4 py-8 text-center text-sm">
              No endpoints in this category.
            </div>
          </template>

          <!-- JSON-RPC (legacy) mode -->
          <template v-else>
            <article v-for="method in filteredMethods" :key="method.name" class="etherscan-card p-5">
              <div class="mb-2 flex items-center gap-2">
                <span
                  class="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  >{{ $t('apiDocsPage.rpcBadge') }}</span
                >
                <span
                  class="rounded px-2 py-0.5 text-xs font-semibold"
                  :class="
                    method.type === 'passthrough'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  "
                >
                  {{ method.type === "passthrough" ? $t('apiDocsPage.typeNative') : $t('apiDocsPage.typeIndexed') }}
                </span>
                <h3 class="text-high font-mono text-sm font-semibold">
                  {{ method.name }}
                </h3>
              </div>

              <p class="text-mid mb-3 text-sm">
                {{ $t(`apiDocsPage.methods.${method.name}`) }}
              </p>

              <pre
                :aria-label="$t('apiDocsPage.examplePayloadAria')"
                class="font-hash text-high overflow-x-auto rounded border border-card-border bg-gray-50 p-3 text-xs leading-relaxed dark:border-card-border-dark dark:bg-gray-800 dark:text-gray-200"
              ><code>{{ buildRequestBody(method) }}</code></pre>
            </article>
            <div v-if="!filteredMethods.length" class="text-low panel-muted border-dashed px-4 py-8 text-center text-sm">
              {{ $t('apiDocsPage.noMethods') }}
            </div>
          </template>
        </main>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import { API_DOCS_RPC_CATEGORIES, API_DOCS_RPC_METHODS } from "@/constants/rpcApiDocs.mjs";
import { READ_API_CATEGORIES, READ_API_ENDPOINTS } from "@/constants/readApiDocs.mjs";
import { getCurrentEnv, getNetworkLabel, getRpcApiBasePath } from "@/utils/env";

// Top-level mode: legacy JSON-RPC (Get*) vs the current Postgres Read API (REST).
const apiMode = ref("rest"); // default to the current, recommended API
const categories = computed(() => (apiMode.value === "rest" ? READ_API_CATEGORIES : API_DOCS_RPC_CATEGORIES));
const methods = API_DOCS_RPC_METHODS;
const restEndpoints = READ_API_ENDPOINTS;
const activeCategory = ref(READ_API_CATEGORIES[0]?.key || "");
const networkLabel = computed(() => getNetworkLabel(getCurrentEnv()));
const rpcBasePath = computed(() => getRpcApiBasePath());

// Reset the active category when switching modes.
function setApiMode(mode) {
  apiMode.value = mode;
  activeCategory.value = (mode === "rest" ? READ_API_CATEGORIES : API_DOCS_RPC_CATEGORIES)[0]?.key || "";
}

const filteredMethods = computed(() => methods.filter((method) => method.category === activeCategory.value));
const filteredEndpoints = computed(() => restEndpoints.filter((ep) => ep.category === activeCategory.value));

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
