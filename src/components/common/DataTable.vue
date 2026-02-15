<script setup>
import { useI18n } from "vue-i18n";
import EmptyState from "./EmptyState.vue";
import Skeleton from "./Skeleton.vue";

const { t } = useI18n();

defineProps({
  columns: {
    type: Array,
    required: true,
    validator: (val) => val.length > 0 && val.every((c) => typeof c.key === "string" && typeof c.label === "string"),
  },
  data: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  rowKey: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
    <table role="table" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
        <tr role="row">
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            :class="[
              'px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
            ]"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
        <template v-if="loading">
          <tr role="row">
            <td :colspan="columns.length" class="px-4 py-3">
              <div class="space-y-3" role="status" aria-live="polite">
                <Skeleton v-for="i in 5" :key="'skeleton-' + i" class="h-4 w-full" />
              </div>
            </td>
          </tr>
        </template>
        <template v-else-if="data.length === 0">
          <tr>
            <td :colspan="columns.length" class="px-4 py-8">
              <slot name="empty">
                <EmptyState :message="t('common.noDataAvailable')" />
              </slot>
            </td>
          </tr>
        </template>
        <template v-else>
          <tr
            v-for="(row, idx) in data"
            :key="rowKey && row[rowKey] != null ? row[rowKey] : idx"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                'px-4 py-3 text-sm text-gray-700 dark:text-gray-300',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
              ]"
            >
              <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
