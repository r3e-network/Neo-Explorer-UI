import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { indexerReadService } from "./indexerReadService";

/**
 * Token Service - Neo3 代币相关 API 调用
 * @module services/tokenService
 * @description 通过 neo3fura 后端获取 NEP17/NEP11 代币数据
 */

export const tokenService = createService(
  {
    /**
     * 获取代币列表（通用）
     * @param {string} type - 代币类型 ("NEP17" | "NEP11")
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
     * @returns {Promise<{result: Array, totalCount: number}>} 代币列表
     */
    getTokenList: {
      _type: "list",
      cacheKey: "token_list",
      rpcMethod: "GetAssetInfos",
      errorLabel: "get token list",
      ttl: CACHE_TTL.chart,
      buildParams: ([type, limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip, Standard: type }),
      buildCacheParams: ([type, limit = 20, skip = 0]) => ({ type, limit, skip }),
    },

    /**
     * 根据哈希获取代币信息
     * @param {string} hash - 合约哈希
     * @returns {Promise<Object|null>} 代币数据
     */
    getByHash: {
      cacheKey: "token_hash",
      rpcMethod: "GetAssetInfoByContractHash",
      fallback: null,
      ttl: CACHE_TTL.token,
      buildParams: ([hash]) => ({ ContractHash: hash }),
      buildCacheParams: ([hash]) => ({ hash }),
    },

    /**
     * 获取代币持有者列表
     * @param {string} hash - 合约哈希
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @returns {Promise<{result: Array, totalCount: number}>} 持有者列表
     */
    getHolders: {
      _type: "list",
      cacheKey: "token_holders",
      rpcMethod: "GetAssetHoldersByContractHash",
      errorLabel: "get token holders",
      ttl: CACHE_TTL.chart,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ ContractHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },

    /**
     * 获取 NEP17 转账记录
     * @param {string} hash - 合约哈希
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
     */
    getNep17Transfers: {
      _type: "list",
      cacheKey: "token_nep17_transfers",
      rpcMethod: "GetNep17TransferByContractHash",
      errorLabel: "get NEP17 transfers",
      ttl: CACHE_TTL.chart,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ ContractHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },

    /**
     * 获取 NEP11 转账记录
     * @param {string} hash - 合约哈希
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
     */
    // NOTE: No backend endpoint GetNep11TransferByContractHash exists.
    // Use getNep11TransfersByTokenId for token-specific transfers,
    // or accountService.getNep11Transfers for address-based queries.

    /**
     * 获取指定 TokenId 的 NEP11 转账记录
     * @param {string} hash - 合约哈希
     * @param {string} tokenId - Token ID
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
     */
    getNep11TransfersByTokenId: {
      _type: "list",
      cacheKey: "token_nep11_transfers_token",
      rpcMethod: "GetNep11TransferByContractHashTokenId",
      errorLabel: "get NEP11 transfers by token",
      ttl: CACHE_TTL.chart,
      buildParams: ([hash, tokenId, limit = 20, skip = 0]) => ({
        ContractHash: hash,
        TokenId: tokenId,
        Limit: limit,
        Skip: skip,
      }),
      buildCacheParams: ([hash, tokenId, limit = 20, skip = 0]) => ({ hash, tokenId, limit, skip }),
    },

    /**
     * 获取 NFT 资产持有者列表（含余额）
     * @param {string} hash - 合约哈希
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @returns {Promise<{result: Array, totalCount: number}>} 持有者列表
     */
    getNftHoldersList: {
      _type: "list",
      cacheKey: "token_nft_holders",
      rpcMethod: "GetAssetHoldersListByContractHash",
      errorLabel: "get NFT holders list",
      ttl: CACHE_TTL.chart,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ ContractHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },

    /**
     * 根据交易哈希获取 NEP17 转账记录（分页）
     * @param {string} txHash - 交易哈希
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
     */
    getTransfersByTxHash: {
      _type: "list",
      cacheKey: "token_nep17_transfers_tx",
      rpcMethod: "GetNep17TransferByTransactionHash",
      errorLabel: "get NEP17 transfers by tx",
      ttl: CACHE_TTL.trace,
      buildParams: ([txHash, limit = 20, skip = 0]) => ({ TransactionHash: txHash, Limit: limit, Skip: skip }),
      buildCacheParams: ([txHash, limit = 20, skip = 0]) => ({ txHash, limit, skip }),
    },

    /**
     * 根据交易哈希获取 NEP11 转账记录（分页）
     * @param {string} txHash - 交易哈希
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @returns {Promise<{result: Array, totalCount: number}>} 转账列表
     */
    getNep11TransfersByTxHash: {
      _type: "list",
      cacheKey: "token_nep11_transfers_tx",
      rpcMethod: "GetNep11TransferByTransactionHash",
      errorLabel: "get NEP11 transfers by tx",
      ttl: CACHE_TTL.trace,
      buildParams: ([txHash, limit = 20, skip = 0]) => ({ TransactionHash: txHash, Limit: limit, Skip: skip }),
      buildCacheParams: ([txHash, limit = 20, skip = 0]) => ({ txHash, limit, skip }),
    },
  },
  {
    /** @see getTokenList */
    async getNep17List(limit = 20, skip = 0, options = {}) {
      return tokenService.getTokenList("NEP17", limit, skip, options);
    },

    /** @see getTokenList */
    async getNep11List(limit = 20, skip = 0, options = {}) {
      return tokenService.getTokenList("NEP11", limit, skip, options);
    },

    async getTokenListWithFallback(type, limit = 20, skip = 0, { search = "", forceRefresh = false } = {}) {
      const legacy = search
        ? await tokenService.searchTokenByName(type, search, limit, skip, { forceRefresh }).catch(() => null)
        : await tokenService.getTokenList(type, limit, skip, { forceRefresh }).catch(() => null);

      if (Array.isArray(legacy?.result) && legacy.result.length > 0) {
        return legacy;
      }

      const payload = await indexerReadService.getTokens(type, limit, skip, { search, forceRefresh });
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      return {
        result: rows.map((item) => ({
          hash: item.contract_hash,
          tokenname: item.display_name || item.contract_hash,
          symbol: item.symbol || "",
          holders: item.holder_count || 0,
          totalsupply:
            String(item.standard || "").toUpperCase() === "NEP11"
              ? item.total_supply_raw || "0"
              : null,
          decimals: Number(item.decimals || 0),
          type: item.standard || type,
          standard: item.standard || type,
        })),
        totalCount: Number(payload?.paging?.total || rows.length || 0),
      };
    },

    async getByHashWithFallback(hash, options = {}) {
      const legacy = await tokenService.getByHash(hash, options).catch(() => null);
      if (legacy?.hash || legacy?.tokenname || legacy?.symbol) {
        return legacy;
      }

      const item = await indexerReadService.getToken(hash, options);
      if (!item) return null;

      // Indexer currently mis-reports decimals/symbol as 0/"" for some
      // NEP-17 contracts (notably the GAS native, which has 8 decimals).
      // Fall back to the on-chain manifest via invokefunction to recover
      // the correct values when both look empty.
      let decimals = Number(item.decimals || 0);
      let symbol = String(item.symbol || "");
      const isNep17 = String(item.standard || "NEP17").toUpperCase() === "NEP17";
      if (isNep17 && (!symbol || decimals === 0)) {
        try {
          const [decRes, symRes] = await Promise.all([
            decimals === 0
              ? safeRpc("invokefunction", [item.contract_hash, "decimals", []], null, options)
              : Promise.resolve(null),
            !symbol
              ? safeRpc("invokefunction", [item.contract_hash, "symbol", []], null, options)
              : Promise.resolve(null),
          ]);
          if (decRes?.state === "HALT") {
            const d = Number(decRes?.stack?.[0]?.value);
            if (Number.isFinite(d) && d >= 0) decimals = d;
          }
          if (symRes?.state === "HALT") {
            const raw = symRes?.stack?.[0]?.value;
            if (typeof raw === "string" && raw) {
              try {
                const decoded = atob(raw);
                if (decoded) symbol = decoded;
              } catch {
                symbol = raw;
              }
            }
          }
        } catch {
          // Indexer values stand if invokefunction fails.
        }
      }

      return {
        hash: item.contract_hash,
        tokenname: item.display_name || item.contract_hash,
        symbol,
        holders: item.holder_count || 0,
        totalsupply: item.total_supply_raw || "0",
        decimals,
        type: item.standard || "NEP17",
        standard: item.standard || "NEP17",
      };
    },

    /**
     * 按名称搜索代币（通用）
     * @param {string} type - 代币标准 ("NEP17" | "NEP11")
     * @param {string} name - 代币名称
     * @param {number} [limit=20] - 每页数量
     * @param {number} [skip=0] - 跳过数量
     * @param {{ forceRefresh?: boolean }} [options={}] - 缓存控制
     * @returns {Promise<{result: Array, totalCount: number}>} 搜索结果
     */
    async searchTokenByName(type, name, limit = 20, skip = 0, options = {}) {
      const cacheOpts = getRealtimeListCacheOptions(options);
      const key = getCacheKey("token_search", { type, name, limit, skip });
      return cachedRequest(
        key,
        () =>
          safeRpcList(
            "GetAssetInfosByName",
            { Name: name, Limit: limit, Skip: skip, Standard: type },
            `search ${type}`,
            cacheOpts
          ),
        CACHE_TTL.chart,
        cacheOpts
      );
    },

    /** @see searchTokenByName */
    async searchNep17ByName(name, limit = 20, skip = 0, options = {}) {
      return tokenService.searchTokenByName("NEP17", name, limit, skip, options);
    },

    /** @see searchTokenByName */
    async searchNep11ByName(name, limit = 20, skip = 0, options = {}) {
      return tokenService.searchTokenByName("NEP11", name, limit, skip, options);
    },

    /**
     * 获取 NEP11 NFT 属性（名称、图片、描述等）
     * @param {string} hash - 合约哈希
     * @param {string[]} tokenIds - Token ID 数组
     * @returns {Promise<Object|null>} NFT 属性数据
     */
    async getNep11Properties(hash, tokenIds, options = {}) {
      const key = getCacheKey("token_nep11_properties", { hash, tokenIds });
      return cachedRequest(
        key,
        () => safeRpc("GetNep11PropertiesByContractHashTokenId", { ContractHash: hash, TokenIds: tokenIds }, null, options),
        CACHE_TTL.token,
        options
      );
    },
  }
);

export default tokenService;
