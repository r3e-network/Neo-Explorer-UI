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
});

const loading = ref(false);
const lastFetch = ref(0);
const CACHE_TTL = 60 * 1000; // 60秒缓存

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
  
  // 防止重复请求
  if (loading.value) return prices.value;
  
  loading.value = true;
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=neo,gas&vs_currencies=usd&include_24hr_change=true",
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();
    
    prices.value = {
      neo: data.neo?.usd || 0,
      gas: data.gas?.usd || 0,
      neoChange: data.neo?.usd_24h_change || 0,
      gasChange: data.gas?.usd_24h_change || 0,
      marketCap: (data.neo?.usd || 0) * 100000000,
    };
    lastFetch.value = now;
  } catch (error) {
    console.error("Failed to fetch prices:", error.message);
    // 保持旧数据或使用默认值
    if (!prices.value.neo) {
      prices.value = {
        neo: 12.5,
        gas: 4.2,
        neoChange: 0,
        gasChange: 0,
        marketCap: 1250000000,
      };
    }
  } finally {
    loading.value = false;
  }
  
  return prices.value;
}

export function usePriceCache() {
  return {
    prices: readonly(prices),
    loading: readonly(loading),
    fetchPrices,
  };
}

export default usePriceCache;
