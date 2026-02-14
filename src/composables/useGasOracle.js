import { ref, computed } from "vue";
import { safeRpc } from "@/services/api";
import { getCacheKey, cachedRequest, CACHE_TTL } from "@/services/cache";

const GAS_DECIMALS = 8;

class GasOracle {
  constructor() {
    this.networkFee = ref(0);
    this.systemFee = ref(0);
    this.lastUpdate = ref(0);
    this.pendingCount = ref(0);
    this.suggestions = ref({
      slow: 0.001,
      average: 0.005,
      fast: 0.01,
    });
  }

  async update() {
    try {
      const [feeRes, txRes] = await Promise.all([
        safeRpc("GetNetworkFee", {}, null),
        safeRpc("GetTransactionCount", {}, 0),
      ]);

      if (feeRes) {
        this.networkFee.value = Number(feeRes.networkFee || feeRes.netfee || 0) / Math.pow(10, GAS_DECIMALS);
        this.systemFee.value = Number(feeRes.systemFee || feeRes.sysfee || 0) / Math.pow(10, GAS_DECIMALS);
      }

      if (typeof txRes === "number") {
        this.pendingCount.value = txRes;
      }

      this.lastUpdate.value = Date.now();
      this.calculateSuggestions();
    } catch (error) {
      if (import.meta.env.DEV) console.warn("Failed to update gas oracle:", error);
    }
  }

  calculateSuggestions() {
    const baseFee = this.networkFee.value + this.systemFee.value;
    const pending = this.pendingCount.value;

    if (pending < 10) {
      this.suggestions.value = {
        slow: Math.max(0.0001, baseFee * 0.8),
        average: Math.max(0.0005, baseFee),
        fast: Math.max(0.001, baseFee * 1.5),
      };
    } else if (pending < 50) {
      this.suggestions.value = {
        slow: Math.max(0.0005, baseFee),
        average: Math.max(0.001, baseFee * 1.5),
        fast: Math.max(0.005, baseFee * 2),
      };
    } else {
      this.suggestions.value = {
        slow: Math.max(0.001, baseFee * 1.2),
        average: Math.max(0.005, baseFee * 2),
        fast: Math.max(0.01, baseFee * 3),
      };
    }
  }

  getSuggestions() {
    return this.suggestions.value;
  }

  getFormattedSuggestions() {
    const s = this.suggestions.value;
    return {
      slow: s.slow.toFixed(6),
      average: s.average.toFixed(6),
      fast: s.fast.toFixed(6),
    };
  }
}

const gasOracle = new GasOracle();

export function useGasOracle() {
  const isLoading = ref(false);
  const error = ref(null);

  async function refresh() {
    isLoading.value = true;
    error.value = null;
    try {
      await gasOracle.update();
    } catch (e) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  const suggestions = computed(() => gasOracle.getFormattedSuggestions());
  const pendingCount = computed(() => gasOracle.pendingCount.value);
  const networkFee = computed(() => gasOracle.networkFee.value);
  const systemFee = computed(() => gasOracle.systemFee.value);
  const lastUpdate = computed(() => gasOracle.lastUpdate.value);

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

export async function getGasPrice() {
  const key = getCacheKey("gas_price", {});
  return cachedRequest(
    key,
    async () => {
      await gasOracle.update();
      return gasOracle.getFormattedSuggestions();
    },
    CACHE_TTL.price,
    { staleWhileRevalidate: true, softTtl: 30000 }
  );
}

export default { useGasOracle, getGasPrice };
