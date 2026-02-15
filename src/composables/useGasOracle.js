/**
 * Gas Oracle Composable
 * @module composables/useGasOracle
 * @description Provides reactive gas fee estimates via a shared singleton state.
 * All components calling useGasOracle() share the same underlying oracle data.
 */
import { ref, computed, reactive } from "vue";
import { safeRpc } from "@/services/api";
import { getCacheKey, cachedRequest, CACHE_TTL } from "@/services/cache";

const GAS_DECIMALS = 8;

/**
 * Module-level shared state (singleton).
 *
 * DESIGN DECISION: This singleton is intentional. Gas oracle data is network-global
 * (not per-component), so all useGasOracle() consumers share the same underlying
 * reactive cache. This avoids redundant RPC calls when multiple components (e.g.
 * GasTracker page + UtilityBar widget) need fee estimates simultaneously.
 *
 * Per-call state (isLoading, error) is created fresh inside useGasOracle() so each
 * consumer tracks its own loading/error lifecycle independently.
 *
 * @type {import('vue').UnwrapNestedRefs<{networkFee: number, systemFee: number, lastUpdate: number, pendingCount: number, suggestions: {slow: number, average: number, fast: number}}>}
 */
const state = reactive({
  networkFee: 0,
  systemFee: 0,
  lastUpdate: 0,
  pendingCount: 0,
  suggestions: { slow: 0.001, average: 0.005, fast: 0.01 },
});

/**
 * Recalculate fee suggestions based on current base fee and mempool pressure.
 */
function calculateSuggestions() {
  const baseFee = state.networkFee + state.systemFee;
  const pending = state.pendingCount;

  if (pending < 10) {
    state.suggestions.slow = Math.max(0.0001, baseFee * 0.8);
    state.suggestions.average = Math.max(0.0005, baseFee);
    state.suggestions.fast = Math.max(0.001, baseFee * 1.5);
  } else if (pending < 50) {
    state.suggestions.slow = Math.max(0.0005, baseFee);
    state.suggestions.average = Math.max(0.001, baseFee * 1.5);
    state.suggestions.fast = Math.max(0.005, baseFee * 2);
  } else {
    state.suggestions.slow = Math.max(0.001, baseFee * 1.2);
    state.suggestions.average = Math.max(0.005, baseFee * 2);
    state.suggestions.fast = Math.max(0.01, baseFee * 3);
  }
}

/**
 * Fetch latest fee data from the network and update shared state.
 */
async function updateOracle() {
  try {
    const [feeRes, txRes] = await Promise.all([
      safeRpc("GetNetworkFee", {}, null),
      safeRpc("GetTransactionCount", {}, 0),
    ]);

    if (feeRes) {
      const netFee = Number(feeRes.networkFee || feeRes.netfee || 0);
      state.networkFee = Number.isFinite(netFee) ? netFee / Math.pow(10, GAS_DECIMALS) : 0;

      const sysFee = Number(feeRes.systemFee || feeRes.sysfee || 0);
      state.systemFee = Number.isFinite(sysFee) ? sysFee / Math.pow(10, GAS_DECIMALS) : 0;
    }

    if (typeof txRes === "number") {
      state.pendingCount = txRes;
    }

    state.lastUpdate = Date.now();
    calculateSuggestions();
  } catch (error) {
    if (import.meta.env.DEV) console.warn("Failed to update gas oracle:", error);
  }
}

/**
 * Format raw suggestion values to 6-decimal strings.
 * @returns {{ slow: string, average: string, fast: string }}
 */
function getFormattedSuggestions() {
  return {
    slow: state.suggestions.slow.toFixed(6),
    average: state.suggestions.average.toFixed(6),
    fast: state.suggestions.fast.toFixed(6),
  };
}

/**
 * Composable that exposes reactive gas oracle data.
 * Instance-level loading/error state; shared oracle data.
 *
 * @returns {{
 *   refresh: () => Promise<void>,
 *   suggestions: import('vue').ComputedRef<{slow: string, average: string, fast: string}>,
 *   pendingCount: import('vue').ComputedRef<number>,
 *   networkFee: import('vue').ComputedRef<number>,
 *   systemFee: import('vue').ComputedRef<number>,
 *   lastUpdate: import('vue').ComputedRef<number>,
 *   isLoading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<string|null>,
 * }}
 */
export function useGasOracle() {
  const isLoading = ref(false);
  const error = ref(null);

  async function refresh() {
    isLoading.value = true;
    error.value = null;
    try {
      await updateOracle();
    } catch (e) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  const suggestions = computed(() => getFormattedSuggestions());
  const pendingCount = computed(() => state.pendingCount);
  const networkFee = computed(() => state.networkFee);
  const systemFee = computed(() => state.systemFee);
  const lastUpdate = computed(() => state.lastUpdate);

  return {
    refresh,
    suggestions,
    pendingCount,
    networkFee,
    systemFee,
    lastUpdate,
    isLoading,
    error,
  };
}

/**
 * Fetch gas price with caching. Returns formatted suggestions.
 * @returns {Promise<{slow: string, average: string, fast: string}>}
 */
export async function getGasPrice() {
  const key = getCacheKey("gas_price", {});
  return cachedRequest(
    key,
    async () => {
      await updateOracle();
      return getFormattedSuggestions();
    },
    CACHE_TTL.price,
    { staleWhileRevalidate: true, softTtl: 30000 }
  );
}

export default { useGasOracle, getGasPrice };
