import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { executionService } from "./executionService";
import { addressToScriptHash } from "../utils/neoHelpers";
import { neotubeService } from "./neotubeService";
import { accountService } from "./accountService";
import { getCurrentEnv } from "../utils/env";
import { callWithRpcEndpointFallback, toNetworkMode } from "@/utils/rpcEndpoints";

/**
 * Transaction Service - Neo3 交易相关 API 调用
 * @module services/transactionService
 * @description 通过 neo3fura 后端获取交易数据
 */

export const transactionService = createService(
  {
    getCount: {
      cacheKey: "tx_count",
      rpcMethod: "GetTransactionCount",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({}),
    },
    _getList: {
      _type: "list",
      cacheKey: "tx_list",
      rpcMethod: "GetTransactionList",
      realtime: true,
      errorLabel: "get transaction list",
      ttl: CACHE_TTL.chart,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    _getByHash: {
      cacheKey: "tx_hash",
      rpcMethod: "GetRawTransactionByTransactionHash",
      fallback: null,
      ttl: CACHE_TTL.txDetail,
      buildParams: ([hash]) => ({ TransactionHash: hash }),
      buildCacheParams: ([hash]) => ({ hash }),
    },
    getInternalTransactions: {
      _type: "list",
      cacheKey: "tx_internal",
      rpcMethod: "GetScCallByTransactionHash",
      errorLabel: "get internal transaction calls",
      ttl: CACHE_TTL.trace,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ TransactionHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },
    getCountByAddress: {
      cacheKey: "tx_count_address",
      rpcMethod: "GetTransactionCountByAddress",
      fallback: 0,
      ttl: CACHE_TTL.address,
      realtime: true,
      buildParams: ([address]) => ({ Address: addressToScriptHash(address) || address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    _getByAddress: {
      _type: "list",
      cacheKey: "tx_address_list",
      rpcMethod: "GetRawTransactionByAddress",
      errorLabel: "get transactions by address",
      ttl: CACHE_TTL.chart,
      buildParams: ([address, limit = 20, skip = 0]) => ({
        Address: addressToScriptHash(address) || address,
        Limit: limit,
        Skip: skip
      }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
    // NOTE: Notifications are extracted from GetApplicationLogByTransactionHash
    // via executionService — no dedicated backend endpoint exists.
  },
  {
    _shouldUseNeoTube(options = {}) {
      if (typeof options.useNeoTube === "boolean") return options.useNeoTube;
      return import.meta.env.MODE !== "test";
    },

    _extractCount(res) {
      const direct = Number(res);
      if (Number.isFinite(direct)) return direct;
      if (!res) return 0;
      return res?.["total counts"] ?? res?.total ?? res?.index ?? res?.count ?? 0;
    },

    _normalizeVmState(value) {
      const normalized = String(value || "").trim().toUpperCase();
      if (!normalized) return "";
      if (normalized.includes("FAULT") || normalized === "FAILED" || normalized === "FAIL" || normalized === "ERROR") {
        return "FAULT";
      }
      if (normalized.includes("HALT") || normalized === "SUCCESS" || normalized === "SUCCEEDED") {
        return "HALT";
      }
      return "";
    },

    async getByHash(hash, options = {}) {
      let tx = await this._getByHash(hash, options);
      if (tx && tx.hash && (tx.blocktime || tx.blockhash || tx.vmstate)) return tx;

      try {
        // Fallback 1: Fura might be lagging. Try native RPC directly bypassing the local proxy.
        const { rpc: neonRpc } = await import('@cityofzion/neon-js');
        const { getCurrentEnv } = await import('@/utils/env');
        const network = toNetworkMode(getCurrentEnv());
        const nativeTx = await callWithRpcEndpointFallback(network, async (endpoint) => {
          const client = new neonRpc.RPCClient(endpoint);
          return client.getRawTransaction(hash, true);
        });
        if (nativeTx && nativeTx.hash) {
          let blockIndex = 0;
          if (nativeTx.blockhash) {
            try {
              const blockHeader = await callWithRpcEndpointFallback(network, async (endpoint) => {
                const client = new neonRpc.RPCClient(endpoint);
                return client.getBlockHeader(nativeTx.blockhash, true);
              });
              blockIndex = blockHeader.index;
            } catch (e) { /* ignore */ }
          }
          return {
            ...tx,
            ...nativeTx,
            vmstate: nativeTx.vmstate || "HALT",
            netfee: nativeTx.netfee,
            sysfee: nativeTx.sysfee,
            blockindex: blockIndex,
            blocktime: nativeTx.blocktime || Date.now(),
          };
        }
      } catch (err) {
        // Ignore native RPC failure
      }

      try {
        // Fallback 2: Mempool
        const { getCurrentEnv } = await import('@/utils/env');
        const { supabaseService } = await import('./supabaseService');
        const env = getCurrentEnv()?.toLowerCase() || 'mainnet';
        const network = env.includes('test') || env.includes('t5') ? 'testnet' : 'mainnet';

        const dbTxs = await supabaseService.getMempoolTransactions(network, 1000);
        const found = dbTxs.find(t => t.hash === hash);

        if (found) {
          return {
            ...tx,
            hash: found.hash,
            sender: found.sender,
            size: found.size,
            netfee: found.netfee,
            sysfee: found.sysfee,
            validuntilblock: found.valid_until_block,
            status: 'pending',
            timestamp: found.timestamp
          };
        }
      } catch (err) {
        // Not in mempool or DB query failed
      }

      return tx;
    },

    _extractVmState(tx) {
      if (!tx) return "";
      return this._normalizeVmState(
        tx.vmstate ??
        tx.Vmstate ??
        tx.VMState ??
        tx.execution_state ??
        tx.executionState ??
        tx.tx_state ??
        tx.txState ??
        tx.state ??
        tx.status
      );
    },

    _extractTransferTxHash(transfer = {}) {
      const hash = transfer?.txid ?? transfer?.txHash ?? transfer?.hash ?? "";
      return String(hash || "").trim();
    },

    _extractTransferTimestamp(transfer = {}) {
      const raw = transfer?.timestamp ?? transfer?.blocktime ?? transfer?.time ?? 0;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    },

    _buildAddressTransferFallbackCandidates(nep17Transfers = [], nep11Transfers = []) {
      const deduped = new Map();
      for (const transfer of [...nep17Transfers, ...nep11Transfers]) {
        const hash = this._extractTransferTxHash(transfer);
        if (!hash) continue;

        const timestamp = this._extractTransferTimestamp(transfer);
        const existing = deduped.get(hash);
        if (!existing || timestamp > existing.timestamp) {
          deduped.set(hash, { hash, timestamp });
        }
      }

      return Array.from(deduped.values()).sort((a, b) => b.timestamp - a.timestamp);
    },

    async _getAddressTransactionsFromTransferFallback(address, limit, skip, options = {}) {
      const safeLimit = Math.max(1, Number(limit) || 20);
      const safeSkip = Math.max(0, Number(skip) || 0);
      const targetWindow = safeLimit + safeSkip;
      const transferFetchLimit = Math.min(Math.max(targetWindow * 3, 60), 1000);

      const [nep17Response, nep11Response] = await Promise.all([
        accountService.getNep17Transfers(address, transferFetchLimit, 0, options),
        accountService.getNep11Transfers(address, transferFetchLimit, 0, options),
      ]);

      const candidates = this._buildAddressTransferFallbackCandidates(
        nep17Response?.result || [],
        nep11Response?.result || []
      );
      if (!candidates.length) return null;

      const pageCandidates = candidates.slice(safeSkip, safeSkip + safeLimit);
      const hydratedPage = await Promise.all(
        pageCandidates.map(async ({ hash, timestamp }) => {
          try {
            const fullTx = await this.getByHash(hash, options);
            if (fullTx?.hash) return fullTx;
          } catch (error) {
            // Ignore per-tx hydration errors and keep fallback row.
          }
          return { hash, blocktime: timestamp, timestamp };
        })
      );

      const totalCount = Math.max(
        candidates.length,
        Number(nep17Response?.totalCount || 0),
        Number(nep11Response?.totalCount || 0)
      );

      return { result: hydratedPage.filter(Boolean), totalCount };
    },

    /**
     * Fetch pending transactions from the mempool.
     * @param {number} [limit=20] - Max items to return.
     * @returns {Promise<Array>} Pending transaction list.
     */
    async getPendingTransactions(limit = 20) {
      const { getCurrentEnv } = await import('@/utils/env');
      const { supabaseService } = await import('./supabaseService');

      const env = getCurrentEnv()?.toLowerCase() || 'mainnet';
      const network = env.includes('test') || env.includes('t5') ? 'testnet' : 'mainnet';
      const supabasePending = await supabaseService.getMempoolTransactions(network, limit);

      if (supabasePending && supabasePending.length > 0) {
        return supabasePending.map(tx => ({
          hash: tx.hash,
          sender: tx.sender,
          netfee: tx.netfee,
          sysfee: tx.sysfee,
          timestamp: tx.timestamp,
          status: 'pending',
          size: tx.size
        }));
      }

      return [];
    },

    /**
     * @deprecated Use executionService.getExecutionTrace directly — identical RPC call.
     */
    async getApplicationLog(txHash) {
      return executionService.getExecutionTrace(txHash);
    },

    async getCount(options = {}) {
      const cacheOpts = getRealtimeListCacheOptions(options);
      const key = getCacheKey("tx_count", {});
      return cachedRequest(
        key,
        async () => {
          const env = getCurrentEnv();
          const canUseNeoTube = this._shouldUseNeoTube(options) && neotubeService.supportsNetwork(env);

          if (canUseNeoTube) {
            try {
              const stats = await neotubeService.getStatistics(env);
              const fastCount = Number(stats?.txs || 0);
              if (fastCount > 0) return fastCount;
            } catch (error) {
              if (import.meta.env.DEV) console.warn("[transactionService] NeoTube tx count fallback:", error);
            }
          }

          const res = await safeRpc("GetTransactionCount", {}, 0, cacheOpts);
          return this._extractCount(res);
        },
        CACHE_TTL.stats,
        cacheOpts
      );
    },

    async getList(limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = false, ...requestOptions } = options;
      const cacheOpts = getRealtimeListCacheOptions(requestOptions);

      const key = getCacheKey("tx_list", { limit, skip });
      const res = await cachedRequest(
        key,
        async () => {
          const env = getCurrentEnv();
          const canUseNeoTube = this._shouldUseNeoTube(requestOptions) && neotubeService.supportsNetwork(env);

          if (canUseNeoTube) {
            try {
              return await neotubeService.getLatestTransactions(limit, skip, env);
            } catch (error) {
              if (import.meta.env.DEV) {
                console.warn("[transactionService] NeoTube tx list fallback:", error);
              }
            }
          }

          return safeRpcList(
            "GetTransactionList",
            { Limit: limit, Skip: skip },
            "get transaction list",
            cacheOpts
          );
        },
        CACHE_TTL.chart,
        cacheOpts
      );

      if (!res || !res.result) return res;

      const enriched = await Promise.all(
        res.result.map(async (tx) => {
          if (enrichMissingFields && !this._extractVmState(tx) && tx.hash) {
            try {
              const full = await this.getByHash(tx.hash, requestOptions);
              const vmState = this._extractVmState(full);
              if (vmState) tx.vmstate = vmState;
            } catch (e) { /* ignore */ }
          }
          return tx;
        })
      );
      return { ...res, result: enriched };
    },

    async getByAddress(address, limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = false, ...requestOptions } = options;
      const res = await this._getByAddress(address, limit, skip, requestOptions);
      if (!res || !res.result) return res;

      let response = res;
      if (Array.isArray(res.result) && res.result.length === 0 && Number(res.totalCount || 0) === 0) {
        try {
          const transferFallback = await this._getAddressTransactionsFromTransferFallback(
            address,
            limit,
            skip,
            requestOptions
          );
          if (transferFallback?.result?.length) {
            response = transferFallback;
          }
        } catch (error) {
          // Keep primary response when fallback retrieval fails.
        }
      }

      const enriched = await Promise.all(
        response.result.map(async (tx) => {
          if (enrichMissingFields && !this._extractVmState(tx) && tx.hash) {
            try {
              const full = await this.getByHash(tx.hash, requestOptions);
              const vmState = this._extractVmState(full);
              if (vmState) tx.vmstate = vmState;
            } catch (e) { /* ignore */ }
          }
          return tx;
        })
      );
      return { ...response, result: enriched };
    }
  }

);

export default transactionService;
