/**
 * API Cache Service - 数据缓存机制
 * @module services/cache
 * @description 提供内存缓存、请求去重、TTL过期等功能
 */

// 缓存存储
const cache = new Map();

// 进行中的请求（用于去重）
const pendingRequests = new Map();

// 默认缓存时间（毫秒）
const DEFAULT_TTL = {
  stats: 30 * 1000, // 统计数据 30秒
  list: 15 * 1000, // 列表数据 15秒
  detail: 60 * 1000, // 详情数据 60秒
  price: 60 * 1000, // 价格数据 60秒
  chart: 5 * 60 * 1000, // 图表数据 5分钟
  trace: 120 * 1000, // 执行追踪 120秒（确认后不可变）
  manifest: 300 * 1000, // 合约 manifest 300秒（极少变更）
  holdings: 30 * 1000, // 代币持仓 30秒（频繁变动）
};

/**
 * 生成缓存键
 * @param {string} method - API方法名
 * @param {object} params - 参数
 * @returns {string} 缓存键
 */
export const getCacheKey = (method, params = {}) => {
  return `${method}:${JSON.stringify(params)}`;
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
export const setCache = (key, data, ttl = DEFAULT_TTL.list) => {
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
export const cachedRequest = async (key, fetchFn, ttl = DEFAULT_TTL.list) => {
  // 1. 检查缓存
  const cached = getCache(key);
  if (cached !== null) {
    return cached;
  }

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
  let validCount = 0;
  let expiredCount = 0;
  const now = Date.now();

  for (const [, item] of cache.entries()) {
    if (now > item.expiry) {
      expiredCount++;
    } else {
      validCount++;
    }
  }

  return {
    total: cache.size,
    valid: validCount,
    expired: expiredCount,
    pending: pendingRequests.size,
  };
};

// 导出TTL常量供外部使用
export const CACHE_TTL = DEFAULT_TTL;

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
};
