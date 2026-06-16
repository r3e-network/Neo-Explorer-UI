import { ref, readonly } from "vue";

/**
 * 价格数据缓存 Composable
 * 全局单例，避免重复请求CoinGecko API
 */

// 全局状态（单例）
const prices = ref({
  neo: 0,
  gas: 0,
  neoChange: 0,
  gasChange: 0,
  marketCap: 0,
  pricingUnavailable: false,
});

const loading = ref(false);
const lastFetch = ref(0);
const CACHE_TTL = 60 * 1000; // 60秒缓存
let pendingPromise = null; // shared promise for concurrent callers

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * 获取价格数据
 * @param {boolean} force - 强制刷新
 */
async function fetchPrices(force = false) {
  const now = Date.now();

  // 检查缓存是否有效
  if (!force && lastFetch.value && now - lastFetch.value < CACHE_TTL) {
    return prices.value;
  }

  // If a fetch is already in-flight, wait for it instead of returning stale data
  if (loading.value && pendingPromise) return pendingPromise;

  loading.value = true;
  pendingPromise = (async () => {
    try {
      const response = await fetch("/api/prices", { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Price endpoint status ${response.status}`);
      const data = await response.json();
      const pricingUnavailable = Boolean(data?.pricingUnavailable);
      const neo = pricingUnavailable ? 0 : toFiniteNumber(data?.neo?.usd);
      const gas = pricingUnavailable ? 0 : toFiniteNumber(data?.gas?.usd);

      prices.value = {
        neo,
        gas,
        neoChange: pricingUnavailable ? 0 : toFiniteNumber(data?.neo?.usd_24h_change),
        gasChange: pricingUnavailable ? 0 : toFiniteNumber(data?.gas?.usd_24h_change),
        marketCap: neo * 100000000,
        pricingUnavailable,
      };
      lastFetch.value = now;
    } catch {
      // Keep previous data if available; otherwise leave at zero.
      // Never inject hardcoded prices — users must not see stale/fake data.
    } finally {
      loading.value = false;
      pendingPromise = null;
    }

    return prices.value;
  })();

  return pendingPromise;
}

export function usePriceCache() {
  return {
    prices: readonly(prices),
    loading: readonly(loading),
    fetchPrices,
  };
}

export default usePriceCache;
