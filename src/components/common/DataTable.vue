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
      <thead class="table-head">
        <tr role="row">
          <th
            v-for="col in columns"
            :key="col.key"
            scope="col"
            :class="[
              col.align === 'right' ? 'table-header-cell-right' : col.align === 'center' ? 'table-header-cell text-center' : 'table-header-cell',
            ]"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y soft-divider">
        <template v-if="loading">
          <tr role="row">
            <td :colspan="columns.length" class="p-4">
              <div class="space-y-3" role="status" aria-live="polite">
                <Skeleton v-for="i in 5" :key="'skeleton-' + i" class="h-4 w-full" />
              </div>
            </td>
          </tr>
        </template>
        <template v-else-if="data.length === 0">
          <tr>
            <td :colspan="columns.length" class="p-8">
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
            class="list-row group"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                col.align === 'right' ? 'table-cell-right' : col.align === 'center' ? 'table-cell text-center' : 'table-cell',
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
