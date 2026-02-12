/**
 * API Cache Service - 数据缓存机制
 * @module services/cache
 * @description 提供内存缓存、请求去重、TTL过期等功能
 */

import { getCurrentEnv } from "../utils/env";

// LRU 缓存上限
const MAX_CACHE_SIZE = 500;

// 缓存存储
const cache = new Map();

/**
 * LRU 淘汰：当缓存达到上限时删除最旧条目
 */
function evictIfNeeded() {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

// 进行中的请求（用于去重）
const pendingRequests = new Map();

// 增量统计计数器
let hitCount = 0;
let missCount = 0;

// 默认缓存时间（毫秒）
const DEFAULT_TTL = {
  block: 15 * 1000, // 区块数据 15秒
  txList: 10 * 1000, // 交易列表 10秒
  txDetail: 60 * 1000, // 交易详情 60秒
  contract: 300 * 1000, // 合约数据 300秒（极少变更）
  token: 120 * 1000, // 代币数据 120秒
  stats: 30 * 1000, // 统计数据 30秒
  trace: 120 * 1000, // 执行追踪 120秒（确认后不可变）
  address: 20 * 1000, // 地址数据 20秒
  price: 60 * 1000, // 价格数据 60秒
  chart: 5 * 60 * 1000, // 图表数据 5分钟
};

// Legacy aliases - deprecated, will be removed in a future version
const DEPRECATED_ALIASES = { list: "block", detail: "txDetail", manifest: "contract", holdings: "stats" };

const LEGACY_TTL = new Proxy(DEFAULT_TTL, {
  get(target, prop) {
    if (prop in DEPRECATED_ALIASES) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[cache] TTL key "${prop}" is deprecated. Use "${DEPRECATED_ALIASES[prop]}" instead.`);
      }
      return target[DEPRECATED_ALIASES[prop]];
    }
    return target[prop];
  },
});

/**
 * 生成缓存键
 * @param {string} method - API方法名
 * @param {object} params - 参数
 * @returns {string} 缓存键
 */
export const getCacheKey = (method, params = {}) => {
  const network = getCurrentEnv();
  return `${network}:${method}:${JSON.stringify(params)}`;
};

/**
 * 获取缓存数据
 * @param {string} key - 缓存键
 * @returns {any|null} 缓存数据或null
 */
export const getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;

  // 检查是否过期
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }

  return item.data;
};

/**
 * 设置缓存数据
 * @param {string} key - 缓存键
 * @param {any} data - 数据
 * @param {number} ttl - 过期时间（毫秒）
 */
export const setCache = (key, data, ttl = DEFAULT_TTL.block) => {
  evictIfNeeded();
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
    timestamp: Date.now(),
  });
};

/**
 * 清除指定缓存
 * @param {string} key - 缓存键
 */
export const clearCache = (key) => {
  cache.delete(key);
};

/**
 * 清除所有缓存
 */
export const clearAllCache = () => {
  cache.clear();
};

/**
 * 清除匹配前缀的缓存
 * @param {string} prefix - 前缀
 */
export const clearCacheByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

/**
 * 带缓存的请求包装器
 * @param {string} key - 缓存键
 * @param {Function} fetchFn - 请求函数
 * @param {number} ttl - 缓存时间
 * @returns {Promise<any>} 数据
 */
export const cachedRequest = async (key, fetchFn, ttl = DEFAULT_TTL.block, { forceRefresh = false } = {}) => {
  // 1. 检查缓存（除非强制刷新）
  if (!forceRefresh) {
    const item = cache.get(key);
    if (item) {
      if (Date.now() <= item.expiry) {
        hitCount++;
        // LRU refresh: move to end of Map iteration order
        cache.delete(key);
        cache.set(key, item);
        return item.data;
      }
      cache.delete(key);
    }
  }
  missCount++;

  // 2. 检查是否有进行中的相同请求（去重）
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // 3. 发起新请求
  const promise = fetchFn()
    .then((data) => {
      setCache(key, data, ttl);
      pendingRequests.delete(key);
      return data;
    })
    .catch((error) => {
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, promise);
  return promise;
};

/**
 * 获取缓存统计信息
 * @returns {object} 统计信息
 */
export const getCacheStats = () => {
  return {
    total: cache.size,
    pending: pendingRequests.size,
    hits: hitCount,
    misses: missCount,
  };
};

// 导出TTL常量供外部使用（使用带deprecation警告的代理）
export const CACHE_TTL = LEGACY_TTL;

export { MAX_CACHE_SIZE };

export default {
  getCache,
  setCache,
  clearCache,
  clearAllCache,
  clearCacheByPrefix,
  cachedRequest,
  getCacheKey,
  getCacheStats,
  CACHE_TTL,
  MAX_CACHE_SIZE,
};
