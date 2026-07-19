<template>
  <div>
    <div class="panel-muted block rounded px-3 py-2 font-hash text-xs break-all">{{ decoded.method_call }}</div>
    <div v-if="parameters.length" class="mt-3 overflow-x-auto">
      <table class="w-full min-w-[560px]">
        <thead class="table-head">
          <tr>
            <th scope="col" class="table-header-cell">{{ tf("neoX.name", "Name") }}</th>
            <th scope="col" class="table-header-cell">{{ tf("neoX.type", "Type") }}</th>
            <th scope="col" class="table-header-cell">{{ tf("neoX.indexed", "Indexed?") }}</th>
            <th scope="col" class="table-header-cell">{{ tf("neoX.value", "Value") }}</th>
          </tr>
        </thead>
        <tbody class="soft-divider divide-y">
          <tr v-for="(param, i) in parameters" :key="i" class="list-row">
            <td class="table-cell">{{ param.name || "—" }}</td>
            <td class="table-cell-secondary">{{ param.type || "—" }}</td>
            <td class="table-cell-secondary">
              <span v-if="param.indexed === true">{{ tf("neoX.yes", "Yes") }}</span>
              <span v-else-if="param.indexed === false">{{ tf("neoX.no", "No") }}</span>
              <span v-else class="text-low">—</span>
            </td>
            <td class="table-cell-mono break-all">{{ paramValue(param) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

// Renders a Blockscout decoded call/event ({ method_call, method_id,
// parameters }) — shared between the tx-detail decoded input row and the
// decoded event blocks in the logs tab.
const props = defineProps({
  decoded: { type: Object, required: true },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const parameters = computed(() => (Array.isArray(props.decoded?.parameters) ? props.decoded.parameters : []));

function paramValue(param) {
  const value = param?.value;
  if (value === undefined || value === null) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (_err) {
      return String(value);
    }
  }
  return String(value);
}
</script>
