<template>
  <div class="space-y-3 p-4">
    <p v-if="fns.length === 0" class="text-sm text-mid">
      {{ tf("neoX.noReadFunctions", "No read functions in this ABI.") }}
    </p>

    <div v-for="(fn, fnIndex) in fns" :key="signatureOf(fn)" class="soft-divider rounded-lg border p-4">
      <!-- Header: function name + output type chips -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-hash text-sm text-high">{{ fn.name }}</span>
        <span v-for="(output, i) in fn.outputs || []" :key="i" class="badge-soft">{{ output.type }}</span>
      </div>

      <!-- Inputs -->
      <div v-if="fn.inputs && fn.inputs.length" class="mt-3 space-y-2">
        <input
          v-for="(input, i) in fn.inputs"
          :key="i"
          v-model="calls[fnIndex].args[i]"
          type="text"
          class="form-input"
          :placeholder="`${input.name || `arg${i}`} (${input.type})`"
          :aria-label="`${fn.name}: ${input.name || `arg${i}`} (${input.type})`"
        />
      </div>

      <div class="mt-3">
        <button
          type="button"
          class="btn-outline gap-1.5 px-3 py-1.5 text-xs"
          :disabled="calls[fnIndex]?.loading"
          @click="query(fn, fnIndex)"
        >
          <svg
            v-if="calls[fnIndex]?.loading"
            class="h-3.5 w-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ tf("neoX.query", "Query") }}
        </button>
      </div>

      <!-- Inline error / results -->
      <p v-if="calls[fnIndex]?.error" class="mt-2 break-all text-xs text-status-error">
        {{ calls[fnIndex].error }}
      </p>
      <div v-else-if="calls[fnIndex]?.results" class="mt-2 space-y-1">
        <div v-for="(result, i) in calls[fnIndex].results" :key="i" class="font-hash break-all text-sm text-high">
          <span v-if="fn.outputs && fn.outputs[i]" class="text-mid">{{ fn.outputs[i].type }}</span>
          {{ result }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useNetworkChange } from "@/composables/useNetworkChange";
import { getNeoxNet } from "@/utils/neoxEnv";
import { rpcService } from "@/services/neox";

// Read-only contract console: renders the ABI's view/pure functions and
// executes them through the allowlisted `/neox-rpc/<net>` proxy (eth_call).
// The ethers Interface is loaded via dynamic import on first query so the
// ethers chunk never ships with the page bundle.
const props = defineProps({
  address: { type: String, required: true },
  abi: { type: Array, default: () => [] },
});

const { t } = useI18n();
const tf = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const fns = computed(() =>
  (Array.isArray(props.abi) ? props.abi : []).filter(
    (item) => item && item.type === "function" && (item.stateMutability === "view" || item.stateMutability === "pure")
  )
);

// Overload-safe key/lookup: "name(type1,type2)".
const signatureOf = (fn) => `${fn.name}(${(fn.inputs || []).map((input) => input.type).join(",")})`;

// Per-function call state, rebuilt whenever the ABI changes.
const calls = reactive([]);
watch(
  fns,
  (list) => {
    calls.length = 0;
    list.forEach((fn) => {
      calls.push({ args: (fn.inputs || []).map(() => ""), loading: false, error: "", results: null });
    });
  },
  { immediate: true }
);

let ifaceCache = null; // { abi, iface } — invalidated when the abi prop changes

async function getInterface() {
  if (ifaceCache && ifaceCache.abi === props.abi) return ifaceCache.iface;
  const { Interface } = await import("ethers");
  const iface = new Interface(props.abi);
  ifaceCache = { abi: props.abi, iface };
  return iface;
}

// Trimmed passthrough — ethers parses decimal uint/int strings and addresses
// natively; only booleans need converting from their text form.
function parseArg(raw, type) {
  const value = String(raw ?? "").trim();
  if (type === "bool") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return value;
}

function stringifyResult(value) {
  if (typeof value === "bigint") return value.toString();
  if (value !== null && typeof value === "object") {
    try {
      return JSON.stringify(value, (_key, entry) => (typeof entry === "bigint" ? entry.toString() : entry));
    } catch (_err) {
      return String(value);
    }
  }
  return String(value);
}

async function query(fn, index) {
  const state = calls[index];
  if (!state || state.loading) return;
  state.loading = true;
  state.error = "";
  state.results = null;
  try {
    const iface = await getInterface();
    const signature = signatureOf(fn);
    const args = (fn.inputs || []).map((input, i) => parseArg(state.args[i], input.type));
    const data = iface.encodeFunctionData(signature, args);
    const returned = await rpcService.ethCall({ to: props.address, data }, { net: getNeoxNet() });
    const decoded = iface.decodeFunctionResult(signature, returned);
    const results = Array.from(decoded, stringifyResult);
    state.results = results.length > 0 ? results : [String(returned ?? "0x")];
  } catch (err) {
    state.error = err?.message || tf("errors.loadFailed", "Failed to load data.");
  } finally {
    state.loading = false;
  }
}

// Stale results from another network would silently mislead — clear them.
useNetworkChange(() => {
  calls.forEach((state) => {
    state.results = null;
    state.error = "";
    state.loading = false;
  });
});
</script>
