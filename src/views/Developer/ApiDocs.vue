<template>
  <div class="api-docs">
    <PageHero :particles="3">
      <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8 animate-page-enter">
        <Breadcrumb :items="[{ label: $t('breadcrumb.home'), to: '/homepage' }, { label: $t('breadcrumb.apiDocs') }]" />

        <div class="mb-6 flex items-center gap-3">
          <div class="page-header-icon bg-icon-primary">
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
            <h1 class="page-title neon-glow-text">{{ $t('apiDocsPage.title') }}</h1>
            <p class="page-subtitle">
              {{ $t('apiDocsPage.subtitleBefore') }} <span class="font-medium">{{ networkLabel }}</span>
            </p>
          </div>
        </div>
      </section>
    </PageHero>

    <section class="mx-auto max-w-[1400px] px-4 py-6 md:py-8 animate-page-enter animate-page-enter-delay-1">

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
          :class="apiMode === 'rest' ? 'bg-primary-600 text-white' : 'bg-card text-mid hover:bg-card-hover'"
          @click="setApiMode('rest')"
        >
          {{ $t('apiDocsPage.modeRestRecommended') }}
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          :class="apiMode === 'rpc' ? 'bg-primary-600 text-white' : 'bg-card text-mid hover:bg-card-hover'"
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
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
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

            <article v-for="ep in filteredEndpoints" :key="ep.path" class="etherscan-card p-5" data-testid="api-docs-rest-endpoint">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span
                  class="rounded bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
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

              <section class="mt-4 rounded-lg border border-card-border bg-surface-muted/60 p-3 dark:border-card-border-dark">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 class="text-high text-xs font-semibold uppercase tracking-wide">
                      {{ $t('apiDocsPage.tryItHeading') }}
                    </h4>
                    <p class="text-low mt-1 text-xs">{{ $t('apiDocsPage.tryItDescription') }}</p>
                  </div>
                  <button
                    type="button"
                    class="btn-primary h-9 px-3 text-sm"
                    data-testid="api-try-run"
                    :disabled="getRestTryState(ep).loading"
                    @click="runRestEndpoint(ep)"
                  >
                    {{ getRestTryState(ep).loading ? $t('apiDocsPage.tryItRunning') : $t('apiDocsPage.tryItRun') }}
                  </button>
                </div>

                <div v-if="ep.pathParams?.length || ep.queryParams?.length" class="mb-3 grid gap-3 md:grid-cols-2">
                  <label
                    v-for="param in ep.pathParams"
                    :key="`path-${ep.path}-${param.name}`"
                    class="space-y-1"
                  >
                    <span class="text-low text-xs font-semibold uppercase">{{ param.name }}</span>
                    <input
                      class="input-field h-9 w-full font-mono text-xs"
                      :data-testid="`api-try-path-${param.name}`"
                      :value="getRestTryState(ep).pathParams[param.name]"
                      @input="setRestTryPathParam(ep, param.name, $event.target.value)"
                    />
                  </label>
                  <label
                    v-for="param in ep.queryParams"
                    :key="`query-${ep.path}-${param.name}`"
                    class="space-y-1"
                  >
                    <span class="text-low text-xs font-semibold uppercase">{{ param.name }}</span>
                    <input
                      class="input-field h-9 w-full font-mono text-xs"
                      :data-testid="`api-try-query-${param.name}`"
                      :placeholder="param.type"
                      :value="getRestTryState(ep).queryParams[param.name]"
                      @input="setRestTryQueryParam(ep, param.name, $event.target.value)"
                    />
                  </label>
                </div>

                <div class="mb-3 rounded border border-card-border bg-gray-50 p-2 dark:border-card-border-dark dark:bg-gray-800">
                  <div class="text-low mb-1 text-xs font-semibold uppercase">{{ $t('apiDocsPage.tryItRequestUrl') }}</div>
                  <div class="text-high break-all font-mono text-xs" data-testid="api-try-url">{{ buildRestTryUrl(ep) }}</div>
                </div>

                <div v-if="getRestTryState(ep).status" class="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span class="rounded-full bg-surface-subtle px-2 py-1 font-semibold text-mid" data-testid="api-try-status">
                    HTTP {{ getRestTryState(ep).status }}
                  </span>
                  <span v-if="getRestTryState(ep).durationMs" class="text-low">
                    {{ getRestTryState(ep).durationMs }}ms
                  </span>
                </div>

                <div
                  v-if="getRestTryState(ep).error"
                  class="mb-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                  data-testid="api-try-error"
                >
                  {{ getRestTryState(ep).error }}
                </div>

                <pre
                  v-if="getRestTryState(ep).result"
                  class="font-hash max-h-[420px] overflow-auto rounded border border-card-border bg-gray-950 p-3 text-xs leading-relaxed text-emerald-100 dark:border-card-border-dark"
                  data-testid="api-try-result"
                ><code>{{ getRestTryState(ep).result }}</code></pre>
              </section>
            </article>
            <div v-if="!filteredEndpoints.length" class="text-low panel-muted border-dashed px-4 py-8 text-center text-sm">
              {{ $t('apiDocsPage.noRestEndpoints') }}
            </div>
          </template>

          <!-- JSON-RPC (legacy) mode -->
          <template v-else>
            <article v-for="method in filteredMethods" :key="method.name" class="etherscan-card p-5" data-testid="api-docs-rpc-method">
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
                      : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
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

              <section class="mt-4 rounded-lg border border-card-border bg-surface-muted/60 p-3 dark:border-card-border-dark">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 class="text-high text-xs font-semibold uppercase tracking-wide">
                      {{ $t('apiDocsPage.tryItHeading') }}
                    </h4>
                    <p class="text-low mt-1 text-xs">{{ $t('apiDocsPage.tryItDescription') }}</p>
                  </div>
                  <button
                    type="button"
                    class="btn-primary h-9 px-3 text-sm"
                    data-testid="api-rpc-try-run"
                    :disabled="getRpcTryState(method).loading"
                    @click="runRpcMethod(method)"
                  >
                    {{ getRpcTryState(method).loading ? $t('apiDocsPage.tryItRunning') : $t('apiDocsPage.tryItRun') }}
                  </button>
                </div>

                <div class="mb-3 rounded border border-card-border bg-gray-50 p-2 dark:border-card-border-dark dark:bg-gray-800">
                  <div class="text-low mb-1 text-xs font-semibold uppercase">{{ $t('apiDocsPage.endpointPrefix') }}</div>
                  <div class="text-high break-all font-mono text-xs">{{ methodBasePath(method) }}</div>
                </div>

                <label class="mb-3 block space-y-1">
                  <span class="text-low text-xs font-semibold uppercase">{{ $t('apiDocsPage.tryItRequestBody') }}</span>
                  <textarea
                    class="input-field min-h-[150px] w-full font-mono text-xs"
                    data-testid="api-rpc-try-body"
                    :value="getRpcTryState(method).body"
                    @input="setRpcTryBody(method, $event.target.value)"
                  />
                </label>

                <div v-if="getRpcTryState(method).status" class="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span class="rounded-full bg-surface-subtle px-2 py-1 font-semibold text-mid" data-testid="api-rpc-try-status">
                    HTTP {{ getRpcTryState(method).status }}
                  </span>
                  <span v-if="getRpcTryState(method).durationMs" class="text-low">
                    {{ getRpcTryState(method).durationMs }}ms
                  </span>
                </div>

                <div
                  v-if="getRpcTryState(method).error"
                  class="mb-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                  data-testid="api-rpc-try-error"
                >
                  {{ getRpcTryState(method).error }}
                </div>

                <pre
                  v-if="getRpcTryState(method).result"
                  class="font-hash max-h-[420px] overflow-auto rounded border border-card-border bg-gray-950 p-3 text-xs leading-relaxed text-emerald-100 dark:border-card-border-dark"
                  data-testid="api-rpc-try-result"
                ><code>{{ getRpcTryState(method).result }}</code></pre>
              </section>
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
import PageHero from "@/components/common/PageHero.vue";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import {
  API_DOCS_RPC_CATEGORIES,
  API_DOCS_RPC_METHODS,
  RPC_METHOD_BASE,
  RPC_MAINNET_ONLY_BADGE,
  RPC_MAINNET_ONLY_NOTE,
} from "@/constants/rpcApiDocs.mjs";
import { READ_API_BASE, READ_API_CATEGORIES, READ_API_ENDPOINTS, READ_API_RESPONSE_HEADERS } from "@/constants/readApiDocs.mjs";
import { getCurrentEnv, getNetworkLabel, getRpcApiBasePath, resolveNetworkName } from "@/utils/env";

const { t } = useI18n();
const API_TRY_TIMEOUT_MS = 12000;

// Top-level mode: legacy JSON-RPC (Get*) vs the current Postgres Read API (REST).
const apiMode = ref("rest"); // default to the current, recommended API
const categories = computed(() => (apiMode.value === "rest" ? READ_API_CATEGORIES : API_DOCS_RPC_CATEGORIES));
const methods = API_DOCS_RPC_METHODS;
const restEndpoints = READ_API_ENDPOINTS;
const responseHeaders = READ_API_RESPONSE_HEADERS;
const activeCategory = ref(READ_API_CATEGORIES[0]?.key || "");
const restTryStates = ref(
  Object.fromEntries(READ_API_ENDPOINTS.map((endpoint) => [restEndpointKey(endpoint), createRestTryState(endpoint)]))
);
const rpcTryStates = ref(
  Object.fromEntries(API_DOCS_RPC_METHODS.map((method) => [rpcMethodKey(method), createRpcTryState(method)]))
);
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

function restEndpointKey(endpoint) {
  return `${endpoint.method} ${endpoint.path}`;
}

function parseExampleUrl(endpoint) {
  const match = String(endpoint?.example || "").match(/"([^"]+)"/);
  if (!match) return null;
  try {
    return new URL(match[1]);
  } catch {
    return null;
  }
}

function extractExamplePathParams(endpoint, exampleUrl) {
  if (!exampleUrl || !endpoint?.pathParams?.length) return {};
  const names = [];
  const pattern = String(endpoint.path).replace(/\{([^}]+)\}/g, (_match, name) => {
    names.push(name);
    return "([^/]+)";
  });
  const match = exampleUrl.pathname.match(new RegExp(`^${pattern}$`));
  if (!match) return {};

  return names.reduce((acc, name, index) => {
    acc[name] = decodeURIComponent(match[index + 1] || "");
    return acc;
  }, {});
}

function createRestTryState(endpoint) {
  const exampleUrl = parseExampleUrl(endpoint);
  const examplePathParams = extractExamplePathParams(endpoint, exampleUrl);
  const pathParams = {};
  const queryParams = {};

  for (const param of endpoint.pathParams || []) {
    pathParams[param.name] = param.name === "network"
      ? resolveNetworkName()
      : examplePathParams[param.name] || "";
  }
  for (const param of endpoint.queryParams || []) {
    queryParams[param.name] = exampleUrl?.searchParams.get(param.name) || "";
  }

  return {
    pathParams,
    queryParams,
    loading: false,
    status: "",
    durationMs: 0,
    result: "",
    error: "",
  };
}

function getRestTryState(endpoint) {
  const key = restEndpointKey(endpoint);
  if (!restTryStates.value[key]) {
    restTryStates.value[key] = createRestTryState(endpoint);
  }
  return restTryStates.value[key];
}

function setRestTryPathParam(endpoint, name, value) {
  getRestTryState(endpoint).pathParams[name] = value;
}

function setRestTryQueryParam(endpoint, name, value) {
  getRestTryState(endpoint).queryParams[name] = value;
}

function buildRestTryUrl(endpoint) {
  const state = getRestTryState(endpoint);
  let path = endpoint.path;
  for (const param of endpoint.pathParams || []) {
    const value = String(state.pathParams[param.name] || "").trim();
    path = path.replace(`{${param.name}}`, encodeURIComponent(value));
  }

  const url = new URL(path, READ_API_BASE);
  for (const param of endpoint.queryParams || []) {
    const value = String(state.queryParams[param.name] || "").trim();
    if (value) url.searchParams.set(param.name, value);
  }
  return url.toString();
}

function formatApiTryPayload(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function parseApiTryPayload(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function runRestEndpoint(endpoint) {
  const state = getRestTryState(endpoint);
  const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  state.loading = true;
  state.status = "";
  state.durationMs = 0;
  state.result = "";
  state.error = "";

  try {
    const response = await fetchWithTimeout(
      buildRestTryUrl(endpoint),
      {
        method: endpoint.method || "GET",
        headers: { Accept: "application/json" },
      },
      API_TRY_TIMEOUT_MS,
    );
    const text = await response.text();
    const payload = parseApiTryPayload(text);
    state.status = String(response.status);
    state.durationMs = Math.round((typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - startedAt);
    state.result = formatApiTryPayload(text);
    if (!response.ok) {
      state.error = t("apiDocsPage.tryItHttpError", { status: response.status });
    } else if (payload?.error) {
      state.error = payload.error.message || t("apiDocsPage.tryItFailed");
    }
  } catch (error) {
    state.error = error?.name === "AbortError"
      ? t("apiDocsPage.tryItTimeout")
      : error?.message || t("apiDocsPage.tryItFailed");
  } finally {
    state.loading = false;
  }
}

function rpcMethodKey(method) {
  return method.name;
}

function createRpcTryState(method) {
  return {
    body: buildRequestBody(method),
    loading: false,
    status: "",
    durationMs: 0,
    result: "",
    error: "",
  };
}

function getRpcTryState(method) {
  const key = rpcMethodKey(method);
  if (!rpcTryStates.value[key]) {
    rpcTryStates.value[key] = createRpcTryState(method);
  }
  return rpcTryStates.value[key];
}

function setRpcTryBody(method, value) {
  getRpcTryState(method).body = value;
}

async function runRpcMethod(method) {
  const state = getRpcTryState(method);
  const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  state.loading = true;
  state.status = "";
  state.durationMs = 0;
  state.result = "";
  state.error = "";

  let body;
  try {
    body = JSON.stringify(JSON.parse(state.body));
  } catch {
    state.loading = false;
    state.error = t("apiDocsPage.tryItInvalidJson");
    return;
  }

  try {
    const response = await fetchWithTimeout(
      methodBasePath(method),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
      },
      API_TRY_TIMEOUT_MS,
    );
    const text = await response.text();
    const payload = parseApiTryPayload(text);
    state.status = String(response.status);
    state.durationMs = Math.round((typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - startedAt);
    state.result = formatApiTryPayload(text);
    if (!response.ok) {
      state.error = t("apiDocsPage.tryItHttpError", { status: response.status });
    } else if (payload?.error) {
      state.error = payload.error.message || t("apiDocsPage.tryItFailed");
    }
  } catch (error) {
    state.error = error?.name === "AbortError"
      ? t("apiDocsPage.tryItTimeout")
      : error?.message || t("apiDocsPage.tryItFailed");
  } finally {
    state.loading = false;
  }
}

function normalizeRpcParams(params) {
  if (Array.isArray(params)) return params;
  if (params && typeof params === "object" && Object.keys(params).length > 0) return [params];
  return [];
}

function buildRequestBody(method) {
  return JSON.stringify(
    {
      jsonrpc: "2.0",
      id: 1,
      method: method.name,
      params: normalizeRpcParams(method.params),
    },
    null,
    2
  );
}
</script>
