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
          <span class="text-high break-all font-mono">POST {{ rpcBasePath }}</span>
        </p>
        <p v-else class="text-mid">
          {{ $t('apiDocsPage.endpointPrefix') }}
          <span class="text-high break-all font-mono">GET https://api.n3index.dev/v1/networks/&#123;network&#125;/...</span>
        </p>
      </div>

      <!-- API mode switcher: REST (current) vs JSON-RPC (legacy) -->
      <div class="mb-4 flex flex-wrap gap-2">
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

      <div class="panel-muted mb-4 p-3 lg:hidden" data-testid="api-docs-mobile-category-nav">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h2 class="text-high text-xs font-semibold uppercase tracking-wide">
            {{ $t('apiDocsPage.categoriesHeading') }}
          </h2>
          <span class="text-low rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium">
            {{ categoryCountLabel }}
          </span>
        </div>
        <nav
          class="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
          :aria-label="$t('apiDocsPage.categoriesAriaLabel')"
        >
          <button
            v-for="category in categories"
            :key="category.key"
            type="button"
            class="min-h-10 flex-shrink-0 snap-start rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            :aria-pressed="activeCategory === category.key"
            :class="
              activeCategory === category.key
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'bg-card text-mid hover:bg-card-hover hover:text-high'
            "
            @click="activeCategory = category.key"
          >
            {{ getCategoryLabel(category) }}
          </button>
        </nav>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <aside class="etherscan-card hidden p-4 lg:block">
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
              {{ getCategoryLabel(category) }}
            </button>
          </nav>
        </aside>

        <main class="space-y-3 lg:col-span-3">
          <!-- REST (Read API) mode -->
          <template v-if="apiMode === 'rest'">
            <section class="panel-muted px-4 py-3">
              <h2 class="text-high mb-2 text-sm font-semibold uppercase tracking-wide">
                {{ $t('apiDocsPage.responseHeadersHeading') }}
              </h2>
              <dl class="grid gap-3 md:grid-cols-2">
                <div v-for="header in responseHeaders" :key="header.key">
                  <dt class="text-high font-mono text-xs font-semibold">{{ header.name }}</dt>
                  <dd class="text-low mt-1 font-mono text-xs">{{ header.values }}</dd>
                  <dd class="text-mid mt-1 text-xs">{{ $t(header.descKey) }}</dd>
                </div>
              </dl>
            </section>

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
                <p class="text-low mb-1 text-xs font-semibold uppercase">{{ $t('apiDocsPage.pathParamsHeading') }}</p>
                <ul class="space-y-1">
                  <li v-for="p in ep.pathParams" :key="p.name" class="text-mid text-xs">
                    <span class="text-high font-mono">{{ p.name }}</span> — {{ p.desc }}
                  </li>
                </ul>
              </div>
              <div v-if="ep.queryParams && ep.queryParams.length" class="mb-2">
                <p class="text-low mb-1 text-xs font-semibold uppercase">{{ $t('apiDocsPage.queryParamsHeading') }}</p>
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
              {{ $t('apiDocsPage.noRestEndpoints') }}
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
                <span
                  v-if="isMainnetOnlyMethod(method)"
                  class="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  data-testid="rpc-mainnet-only-badge"
                >
                  {{ mainnetOnlyBadge }}
                </span>
                <h3 class="text-high font-mono text-sm font-semibold">
                  {{ method.name }}
                </h3>
              </div>

              <p class="text-mid mb-3 text-sm">
                {{ $t(`apiDocsPage.methods.${method.name}`) }}
              </p>

              <p class="text-mid mb-2 text-xs">
                <span class="text-low">{{ $t('apiDocsPage.endpointPrefix') }}</span>
                <span class="text-high break-all font-mono" data-testid="rpc-method-endpoint"
                  >POST {{ methodBasePath(method) }}</span
                >
              </p>
              <p
                v-if="isMainnetOnlyMethod(method)"
                class="text-low mb-2 text-xs"
                data-testid="rpc-mainnet-only-note"
              >
                {{ mainnetOnlyNote }}
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
import { useI18n } from "vue-i18n";
import Breadcrumb from "@/components/common/Breadcrumb.vue";
import {
  API_DOCS_RPC_CATEGORIES,
  API_DOCS_RPC_METHODS,
  RPC_METHOD_BASE,
  RPC_MAINNET_ONLY_BADGE,
  RPC_MAINNET_ONLY_NOTE,
} from "@/constants/rpcApiDocs.mjs";
import { READ_API_CATEGORIES, READ_API_ENDPOINTS, READ_API_RESPONSE_HEADERS } from "@/constants/readApiDocs.mjs";
import { getCurrentEnv, getNetworkLabel, getRpcApiBasePath } from "@/utils/env";

const { t } = useI18n();

// Top-level mode: legacy JSON-RPC (Get*) vs the current Postgres Read API (REST).
const apiMode = ref("rest"); // default to the current, recommended API
const categories = computed(() => (apiMode.value === "rest" ? READ_API_CATEGORIES : API_DOCS_RPC_CATEGORIES));
const methods = API_DOCS_RPC_METHODS;
const restEndpoints = READ_API_ENDPOINTS;
const responseHeaders = READ_API_RESPONSE_HEADERS;
const activeCategory = ref(READ_API_CATEGORIES[0]?.key || "");
const networkLabel = computed(() => getNetworkLabel(getCurrentEnv()));
const rpcBasePath = computed(() => getRpcApiBasePath());

// The legacy indexed Get* methods and the getvalidatedstateroot helper are
// served ONLY by the /api/<network> edge-worker intercept, never by the bare
// NEO-GO node behind /rpc (#18). Derive the /api sibling from the active /rpc
// base by swapping the route segment so a copy-pasted example targets a URL
// that can actually serve the method. These intercepts run on mainnet only.
const apiInterceptBasePath = computed(() =>
  String(rpcBasePath.value).replace(/\/rpc(\/|$)/, "/api$1")
);

// Resolve the POST endpoint for a documented RPC method: the /api intercept
// base for indexed + getvalidatedstateroot, the /rpc origin-proxy otherwise.
function methodBasePath(method) {
  return method?.base === RPC_METHOD_BASE.api ? apiInterceptBasePath.value : rpcBasePath.value;
}

function isMainnetOnlyMethod(method) {
  return Boolean(method?.mainnetOnly);
}

// Annotation strings sourced from the owned constants module (see #18) so the
// mainnet-only note ships without editing i18n lang bundles.
const mainnetOnlyBadge = RPC_MAINNET_ONLY_BADGE;
const mainnetOnlyNote = RPC_MAINNET_ONLY_NOTE;

// Reset the active category when switching modes.
function setApiMode(mode) {
  apiMode.value = mode;
  activeCategory.value = (mode === "rest" ? READ_API_CATEGORIES : API_DOCS_RPC_CATEGORIES)[0]?.key || "";
}

const filteredMethods = computed(() => methods.filter((method) => method.category === activeCategory.value));
const filteredEndpoints = computed(() => restEndpoints.filter((ep) => ep.category === activeCategory.value));
const filteredItemCount = computed(() => (apiMode.value === "rest" ? filteredEndpoints.value.length : filteredMethods.value.length));
const categoryCountLabel = computed(() =>
  apiMode.value === "rest"
    ? t("apiDocsPage.endpointCount", { count: filteredItemCount.value })
    : t("apiDocsPage.methodCount", { count: filteredItemCount.value })
);

function getCategoryLabel(category) {
  return apiMode.value === "rest" ? category.label : t(`apiDocsPage.categories.${category.key}`);
}

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
