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
  caption: {
    type: String,
    default: "",
  },
  rowKey: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <div class="surface-panel overflow-x-auto">
    <table
      role="table"
      class="min-w-full divide-y"
      style="border-color: var(--line-soft)"
      :aria-busy="loading ? 'true' : 'false'"
    >
      <caption v-if="caption" class="sr-only">
        {{ caption }}
      </caption>
      <thead class="sticky top-0 backdrop-blur-sm" style="background: var(--surface-elevated)">
        <tr role="row">
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            :class="[
              'px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-mid',
              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
            ]"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y bg-transparent" style="border-color: var(--line-soft)">
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
            class="list-row transition-colors"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                'px-4 py-3 text-sm text-high',
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
