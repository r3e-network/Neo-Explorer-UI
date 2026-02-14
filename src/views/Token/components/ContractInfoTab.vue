<template>
  <div>
    <!-- Extra Info -->
    <div v-if="manifest.extra && JSON.stringify(manifest.extra) !== '{}'" class="etherscan-card mb-4">
      <div class="card-header">
        <h3 class="text-sm font-semibold text-text-primary dark:text-gray-100">Extra</h3>
      </div>
      <div class="flex flex-wrap gap-x-8 gap-y-2 px-4 py-3 text-sm">
        <div v-if="manifest.extra['Email']">
          <span class="text-text-secondary">Email:</span>
          <a :href="'mailto:' + manifest.extra['Email']" class="ml-1 etherscan-link">
            {{ manifest.extra["Email"] }}
          </a>
        </div>
        <div v-if="manifest.extra['Author']">
          <span class="text-text-secondary">Author:</span>
          <span class="ml-1 text-text-primary dark:text-gray-200">{{ manifest.extra["Author"] }}</span>
        </div>
        <div v-if="manifest.extra['Description']">
          <span class="text-text-secondary">Description:</span>
          <span class="ml-1 text-text-primary dark:text-gray-200">{{ manifest.extra["Description"] }}</span>
        </div>
      </div>
    </div>

    <!-- ABI: Events -->
    <div v-if="manifest.abi && manifest.abi.events && manifest.abi.events.length > 0" class="etherscan-card mb-4">
      <div class="card-header">
        <h3 class="text-sm font-semibold text-text-primary dark:text-gray-100">Events</h3>
      </div>
      <div class="divide-y divide-card-border dark:divide-card-border-dark">
        <details v-for="(item, index) in manifest['abi']['events']" :key="'event-' + index" class="group">
          <summary
            class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
          >
            <svg
              class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            {{ item["name"] }}
          </summary>
          <div class="px-4 pb-3 pl-10">
            <div class="text-xs font-medium uppercase text-text-secondary mb-2">Parameters</div>
            <div v-if="item['parameters'].length > 0" class="space-y-1">
              <div v-for="(param, ind) in item['parameters']" :key="ind" class="flex gap-2 text-sm">
                <span class="font-medium text-text-secondary">{{ param["name"] }}:</span>
                <span class="text-text-primary dark:text-gray-300">{{ param["type"] }}</span>
              </div>
            </div>
            <div v-else class="text-sm text-text-muted">null</div>
          </div>
        </details>
      </div>
    </div>

    <!-- ABI: Methods -->
    <div v-if="manifest.abi && manifest.abi.methods" class="etherscan-card">
      <div class="card-header">
        <h3 class="text-sm font-semibold text-text-primary dark:text-gray-100">Methods</h3>
      </div>
      <div class="divide-y divide-card-border dark:divide-card-border-dark">
        <details v-for="(item, index) in manifest['abi']['methods']" :key="'method-' + index" class="group">
          <summary
            class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-text-primary hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
          >
            <svg
              class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            {{ item["name"] }}
            <span
              v-if="item['safe']"
              class="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >safe</span
            >
          </summary>
          <div class="px-4 pb-4 pl-10">
            <!-- Query button for safe methods -->
            <div v-if="item['safe']" class="mb-3">
              <button class="btn-outline text-xs" aria-label="Query method" @click="$emit('query', index)">
                Query
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <!-- Parameters -->
              <div>
                <div class="text-xs font-medium uppercase text-text-secondary mb-1">Parameters</div>
                <div v-if="item['parameters'].length > 0">
                  <div v-for="(param, ind) in item['parameters']" :key="ind" class="mb-1 text-sm">
                    <span class="font-medium text-text-secondary">{{ param["name"] }}:</span>
                    <span class="ml-1 text-text-primary dark:text-gray-300">{{ param["type"] }}</span>
                    <input
                      v-if="item['safe']"
                      :value="param.value"
                      type="text"
                      :aria-label="`Parameter ${param['name']}`"
                      class="form-input mt-1 py-1 text-xs"
                      @input="
                        $emit('update-param', { methodIndex: index, paramIndex: ind, value: $event.target.value })
                      "
                    />
                  </div>
                </div>
                <div v-else class="text-sm text-text-muted">No parameters</div>
              </div>
              <!-- Return Type -->
              <div>
                <div class="text-xs font-medium uppercase text-text-secondary mb-1">Return Type</div>
                <div class="text-sm text-text-primary dark:text-gray-300">
                  {{ item["returntype"] }}
                </div>
              </div>
              <!-- Offset -->
              <div>
                <div class="text-xs font-medium uppercase text-text-secondary mb-1">Offset</div>
                <div class="text-sm text-text-primary dark:text-gray-300">
                  {{ item["offset"] }}
                </div>
              </div>
              <!-- Safe -->
              <div>
                <div class="text-xs font-medium uppercase text-text-secondary mb-1">Safe</div>
                <div class="text-sm text-text-primary dark:text-gray-300">
                  {{ item["safe"] }}
                </div>
              </div>
            </div>

            <!-- Error / Response -->
            <div
              class="mt-3"
              v-if="manifest['abi']['methods'][index]['error'] && manifest['abi']['methods'][index]['error'] !== ''"
            >
              <div class="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Error</div>
              <div class="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {{ manifest["abi"]["methods"][index]["error"] }}
              </div>
            </div>
            <div
              class="mt-3"
              v-else-if="manifest['abi']['methods'][index]['raw'] && manifest['abi']['methods'][index]['raw'] !== ''"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-semibold text-text-primary dark:text-gray-100">Response</span>
                <button class="btn-mini" aria-label="Decode response" @click="$emit('decode', index)">
                  {{ manifest["abi"]["methods"][index]["button"] }}
                </button>
              </div>
              <contract-json-view
                v-if="manifest['abi']['methods'][index]['isRaw']"
                :json="manifest['abi']['methods'][index]['raw']"
              />
              <contract-json-view v-else :json="manifest['abi']['methods'][index]['display']" />
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup>
import ContractJsonView from "../../Contract/ContractJsonView";

defineProps({
  manifest: {
    type: Object,
    required: true,
  },
});

defineEmits(["query", "decode", "update-param"]);
</script>
