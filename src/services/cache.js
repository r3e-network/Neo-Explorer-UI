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

// 进行中的请求（用于去重）
const pendingRequests = new Map();

// 增量统计计数器
let hitCount = 0;
let missCount = 0;

// Session storage persistence
const SESSION_CACHE_KEY = "neo_explorer_session_cache";
let saveTimeout = null;

if (typeof window !== "undefined" && window.sessionStorage) {
  try {
    const data = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const now = Date.now();
      parsed.forEach(([k, v]) => {
        if (v.expiry > now) cache.set(k, v);
      });
    }
  } catch (e) {
    console.warn("Restoring cache from session storage failed", e);
  }
}

function persistCache() {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      // Avoid DOM quota exceeded errors by limiting to 100 items for persistence
      const entries = Array.from(cache.entries()).slice(-100);
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(entries));
    } catch (e) {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  }, 1000);
}

// 默认缓存时间（毫秒）
const DEFAULT_TTL = {
  block: 15 * 1000,
  txList: 10 * 1000,
  txDetail: 60 * 1000,
  contract: 300 * 1000,
  token: 120 * 1000,
  stats: 30 * 1000,
  trace: 120 * 1000,
  address: 20 * 1000,
  price: 60 * 1000,
  chart: 5 * 60 * 1000,
};

// Legacy aliases - deprecated, will be removed in a future version
const DEPRECATED_ALIASES = { list: "block", detail: "txDetail", manifest: "contract", holdings: "stats" };

const LEGACY_TTL = new Proxy(DEFAULT_TTL, {
  get(target, prop) {
    if (prop in DEPRECATED_ALIASES) {
      if (import.meta.env.DEV) {
        console.warn(`[cache] TTL key "${prop}" is deprecated. Use "${DEPRECATED_ALIASES[prop]}" instead.`);
      }
      return target[DEPRECATED_ALIASES[prop]];
    }
    return target[prop];
  },
});

/**
 * LRU 淘汰：当缓存达到上限时删除最旧条目
 */
function evictIfNeeded() {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function touchCacheItem(key, item) {
  // LRU refresh: move to end of Map iteration order
  cache.delete(key);
  cache.set(key, item);
  persistCache();
}

function getValidCacheItem(key, { touch = false } = {}) {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiry) {
    cache.delete(key);
    persistCache();
    return null;
  }

  if (touch) {
    touchCacheItem(key, item);
  }

  return item;
}

function fetchAndCache(key, fetchFn, ttl) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

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
}

const normalizeSoftTtl = (softTtl, ttl) => {
  if (Number.isFinite(softTtl)) {
    return Math.max(0, softTtl);
  }

  return Math.max(0, ttl);
};

/**
 * 生成缓存键
 * @param {string} method - API方法名
 * @param {object} params - 参数
 * @returns {string} 缓存键
 */
export const getCacheKey = (method, params = {}) => {
  const network = getCurrentEnv();
  const sortedParams = JSON.stringify(params, Object.keys(params).sort());
  return `${network}:${method}:${sortedParams}`;
};

/**
 * 获取缓存元信息
 * @param {string} key - 缓存键
 * @returns {{key: string, data: any, timestamp: number, expiry: number, ttl: number, age: number, remaining: number}|null}
 */
export const getCacheMeta = (key) => {
  const item = getValidCacheItem(key);
  if (!item) return null;

  const now = Date.now();
  return {
    key,
    data: item.data,
    timestamp: item.timestamp,
    expiry: item.expiry,
    ttl: item.ttl,
    age: now - item.timestamp,
    remaining: Math.max(0, item.expiry - now),
  };
};

/**
 * 判断缓存是否在指定时间窗口内为“新鲜”
 * @param {string} key - 缓存键
 * @param {number} ttl - 新鲜窗口（毫秒）
 * @returns {boolean}
 */
export const isCacheFresh = (key, ttl = DEFAULT_TTL.block) => {
  const meta = getCacheMeta(key);
  if (!meta) return false;
  return meta.age <= ttl;
};

/**
 * 获取缓存数据
 * @param {string} key - 缓存键
 * @returns {any|null} 缓存数据或null
 */
export const getCache = (key) => {
  const item = getValidCacheItem(key, { touch: true });
  return item ? item.data : null;
};

/**
 * 设置缓存数据
 * @param {string} key - 缓存键
 * @param {any} data - 数据
 * @param {number} ttl - 过期时间（毫秒）
 */
export const setCache = (key, data, ttl = DEFAULT_TTL.block) => {
  evictIfNeeded();

  const timestamp = Date.now();
  cache.set(key, {
    data,
    expiry: timestamp + ttl,
    timestamp,
    ttl,
  });
  persistCache();
};

/**
 * 清除指定缓存
 * @param {string} key - 缓存键
 */
export const clearCache = (key) => {
  cache.delete(key);
  persistCache();
};

/**
 * 清除所有缓存
 */
export const clearAllCache = () => {
  cache.clear();
  persistCache();
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
  persistCache();
};

/**
 * 带缓存的请求包装器
 * @param {string} key - 缓存键
 * @param {Function} fetchFn - 请求函数
 * @param {number} ttl - 缓存时间（硬过期）
 * @param {{forceRefresh?: boolean, staleWhileRevalidate?: boolean, softTtl?: number, onBackgroundRefreshError?: Function}} options
 * @returns {Promise<any>} 数据
 */
export const cachedRequest = async (
  key,
  fetchFn,
  ttl = DEFAULT_TTL.block,
  { forceRefresh = false, staleWhileRevalidate = false, softTtl, onBackgroundRefreshError } = {}
) => {
  if (!forceRefresh) {
    const item = getValidCacheItem(key, { touch: true });

    if (item) {
      hitCount++;

      if (staleWhileRevalidate) {
        const revalidateAfter = normalizeSoftTtl(softTtl, ttl);
        const age = Date.now() - item.timestamp;

        if (age >= revalidateAfter && !pendingRequests.has(key)) {
          fetchAndCache(key, fetchFn, ttl).catch((error) => {
            if (typeof onBackgroundRefreshError === "function") {
              onBackgroundRefreshError(error);
              return;
            }

            if (import.meta.env.DEV) {
              console.warn(`[cache] Background refresh failed for key: ${key}`, error);
            }
          });
        }
      }

      return item.data;
    }
  }

  missCount++;
  return fetchAndCache(key, fetchFn, ttl);
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
  getCacheMeta,
  isCacheFresh,
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
