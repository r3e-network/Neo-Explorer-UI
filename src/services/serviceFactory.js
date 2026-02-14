import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { getNetworkRefreshIntervalMs } from "../utils/env";

/**
 * Shared realtime cache options — stale-while-revalidate with network-aware soft TTL.
 * Extracted from the identical helper duplicated across every service file.
 * @param {Object} [options={}]
 * @returns {Object} Cache options with SWR defaults
 */
export const getRealtimeListCacheOptions = (options = {}) => ({
  staleWhileRevalidate: true,
  softTtl: getNetworkRefreshIntervalMs(),
  ...options,
});

/**
 * Create a cached RPC method that calls safeRpc and caches the result.
 *
 * @param {Object} config
 * @param {string} config.cacheKey   - Cache key prefix (e.g. "block_hash")
 * @param {string} config.rpcMethod  - RPC method name (e.g. "GetBlockByBlockHash")
 * @param {*}      [config.fallback=null] - Default value on RPC failure
 * @param {number} [config.ttl=CACHE_TTL.block] - Hard cache TTL in ms
 * @param {boolean} [config.realtime=false] - Use SWR realtime cache options
 * @param {(args: any[]) => Object} config.buildParams - Maps call arguments to RPC params
 * @param {(args: any[]) => Object} [config.buildCacheParams] - Maps call arguments to cache key params (defaults to buildParams)
 * @returns {Function} Async service method
 */
export function createRpcMethod({
  cacheKey,
  rpcMethod,
  fallback = null,
  ttl = CACHE_TTL.block,
  realtime = false,
  buildParams,
  buildCacheParams,
}) {
  return async function (...args) {
    // Last argument is always the options object if it's a plain object
    const lastArg = args[args.length - 1];
    const hasOptions =
      lastArg !== null && typeof lastArg === "object" && !Array.isArray(lastArg) && !(lastArg instanceof Date);
    const options = hasOptions ? lastArg : {};
    const callArgs = hasOptions ? args.slice(0, -1) : args;

    const cacheParams = (buildCacheParams || buildParams)(callArgs);
    const key = getCacheKey(cacheKey, cacheParams);
    const rpcParams = buildParams(callArgs);
    const cacheOpts = realtime ? getRealtimeListCacheOptions(options) : options;

    return cachedRequest(key, () => safeRpc(rpcMethod, rpcParams, fallback), ttl, cacheOpts);
  };
}

/**
 * Create a cached RPC list method that calls safeRpcList and caches the result.
 * Assumes the last two positional args before options are (limit, skip).
 *
 * @param {Object} config
 * @param {string} config.cacheKey   - Cache key prefix
 * @param {string} config.rpcMethod  - RPC method name
 * @param {string} config.errorLabel - Human-readable label for error logging
 * @param {number} [config.ttl=CACHE_TTL.chart] - Hard cache TTL
 * @param {boolean} [config.realtime=true] - Use SWR realtime cache options
 * @param {(args: any[]) => Object} config.buildParams - Maps call arguments to RPC params (receives all args including limit/skip)
 * @param {(args: any[]) => Object} [config.buildCacheParams] - Maps call arguments to cache key params
 * @returns {Function} Async service method
 */
export function createRpcListMethod({
  cacheKey,
  rpcMethod,
  errorLabel,
  ttl = CACHE_TTL.chart,
  realtime = true,
  buildParams,
  buildCacheParams,
}) {
  return async function (...args) {
    const lastArg = args[args.length - 1];
    const hasOptions =
      lastArg !== null && typeof lastArg === "object" && !Array.isArray(lastArg) && !(lastArg instanceof Date);
    const options = hasOptions ? lastArg : {};
    const callArgs = hasOptions ? args.slice(0, -1) : args;

    const cacheParams = (buildCacheParams || buildParams)(callArgs);
    const key = getCacheKey(cacheKey, cacheParams);
    const rpcParams = buildParams(callArgs);
    const cacheOpts = realtime ? getRealtimeListCacheOptions(options) : options;

    return cachedRequest(key, () => safeRpcList(rpcMethod, rpcParams, errorLabel), ttl, cacheOpts);
  };
}

/**
 * Build a service object from a config map of method definitions plus optional custom overrides.
 *
 * @param {Object<string, Object>} methods - Map of method name to createRpcMethod/createRpcListMethod config
 * @param {Object} [overrides={}] - Additional methods or overrides (raw functions)
 * @returns {Object} Service object
 */
export function createService(methods, overrides = {}) {
  const service = {};

  for (const [name, config] of Object.entries(methods)) {
    if (config._type === "list") {
      const { _type, ...rest } = config;
      service[name] = createRpcListMethod(rest);
    } else {
      const { _type, ...rest } = config;
      service[name] = createRpcMethod(rest);
    }
  }

  // Apply overrides — they can reference `this` via the service object
  Object.assign(service, overrides);

  return service;
}
