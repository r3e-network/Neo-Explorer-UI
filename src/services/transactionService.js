import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { addressToScriptHash } from "../utils/neoHelpers";
import { accountService } from "./accountService";
import { indexerReadService } from "./indexerReadService";
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
        Skip: skip,
      }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
    // NOTE: Notifications are extracted from GetApplicationLogByTransactionHash
    // via executionService — no dedicated backend endpoint exists.
  },
  {
    _extractCount(res) {
      const direct = Number(res);
      if (Number.isFinite(direct)) return direct;
      if (!res) return 0;
      return res?.["total counts"] ?? res?.total ?? res?.index ?? res?.count ?? 0;
    },

    _normalizeVmState(value) {
      const normalized = String(value || "")
        .trim()
        .toUpperCase();
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
      // Native RPC first — `getrawtransaction` is the canonical source
      // and works against any Neo node. The legacy
      // GetRawTransactionByTransactionHash JSON-RPC was the previous
      // primary path but always returned `{result: null, error: "not
      // found"}` post-Mongo-deletion; live audit caught it firing on
      // every tx-detail page load with no useful payload.
      let tx = null;
      try {
        const { loadNeonJs: _loadNeon } = await import("@/utils/neonLoader.js"); const _njs = await _loadNeon(); if (!_njs) throw new Error("neon-js not available"); const RpcClient = _njs.rpc.RPCClient;
        const { getCurrentEnv } = await import("@/utils/env");
        const network = toNetworkMode(getCurrentEnv());
        const { toAbsoluteUrl } = await import("@/utils/env");
        const nativeTx = await callWithRpcEndpointFallback(network, async (endpoint) => {
          const client = new RpcClient(toAbsoluteUrl(endpoint));
          return client.getRawTransaction(hash, true);
        });
        if (nativeTx && nativeTx.hash) {
          let blockIndex = 0;
          if (nativeTx.blockhash) {
            try {
              const blockHeader = await callWithRpcEndpointFallback(network, async (endpoint) => {
                const client = new RpcClient(toAbsoluteUrl(endpoint));
                return client.getBlockHeader(nativeTx.blockhash, true);
              });
              blockIndex = blockHeader.index;
            } catch (e) {
              if (import.meta.env.DEV) console.warn("[transactionService] block header fetch failed:", e);
            }
          }
          return {
            ...nativeTx,
            vmstate: nativeTx.vmstate || "",
            netfee: nativeTx.netfee,
            sysfee: nativeTx.sysfee,
            blockindex: blockIndex,
            blocktime: nativeTx.blocktime || Date.now(),
          };
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[transactionService] native RPC primary failed:", err);
      }

      // Legacy fallback — only reached if the chain node is unreachable
      // entirely. Once neo3fura_http is removed this returns "not found"
      // and we'll fall through to the mempool lookup below.
      tx = await this._getByHash(hash, options);
      if (tx && tx.hash && (tx.blocktime || tx.blockhash || tx.vmstate)) return tx;

      try {
        // Final fallback: mempool — the tx may not be on chain yet.
        const { resolveNetworkName } = await import("@/utils/env");
        const { supabaseService } = await import("./supabaseService");
        const network = resolveNetworkName();

        const dbTxs = await supabaseService.getMempoolTransactions(network, 1000);
        const found = dbTxs.find((t) => t.hash === hash);

        if (found) {
          return {
            ...tx,
            hash: found.hash,
            sender: found.sender,
            size: found.size,
            netfee: found.netfee,
            sysfee: found.sysfee,
            validuntilblock: found.valid_until_block,
            status: "pending",
            timestamp: found.timestamp,
          };
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[transactionService] mempool lookup failed:", err);
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
          tx.status,
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
        nep11Response?.result || [],
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
        }),
      );

      const totalCount = Math.max(
        candidates.length,
        Number(nep17Response?.totalCount || 0),
        Number(nep11Response?.totalCount || 0),
      );

      return { result: hydratedPage.filter(Boolean), totalCount };
    },

    /**
     * Fetch pending transactions from the mempool.
     * @param {number} [limit=20] - Max items to return.
     * @returns {Promise<Array>} Pending transaction list.
     */
    async getPendingTransactions(limit = 20) {
      const { resolveNetworkName } = await import("@/utils/env");
      const { supabaseService } = await import("./supabaseService");

      const network = resolveNetworkName();
      const supabasePending = await supabaseService.getMempoolTransactions(network, limit);

      if (supabasePending && supabasePending.length > 0) {
        return supabasePending.map((tx) => ({
          hash: tx.hash,
          sender: tx.sender,
          netfee: tx.netfee,
          sysfee: tx.sysfee,
          timestamp: tx.timestamp,
          status: "pending",
          size: tx.size,
        }));
      }

      return [];
    },


    async getCount(options = {}) {
      const cacheOpts = getRealtimeListCacheOptions(options);
      const key = getCacheKey("tx_count", {});
      return cachedRequest(
        key,
        async () => {
          // Indexer first — total_tx_count is the authoritative chain-wide
          // counter. The legacy GetTransactionCount RPC reads from a Mongo
          // collection that's no longer being populated.
          try {
            const summary = await indexerReadService.getSummary(cacheOpts);
            const fromSummary = Number(summary?.total_tx_count);
            if (Number.isFinite(fromSummary) && fromSummary > 0) return fromSummary;
          } catch { /* fall through */ }
          const res = await safeRpc("GetTransactionCount", {}, 0, cacheOpts);
          return this._extractCount(res);
        },
        CACHE_TTL.stats,
        cacheOpts,
      );
    },

    async getList(limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = false, ...requestOptions } = options;
      const cacheOpts = getRealtimeListCacheOptions(requestOptions);

      const key = getCacheKey("tx_list", { limit, skip });
      const res = await cachedRequest(
        key,
        async () => {
          // Indexer first — same Mongo→Postgres pattern as #150/#152/#153/#168.
          // The legacy GetTransactionList queries a Mongo collection that's
          // not being populated; without this branch the homepage tx list and
          // /transactions page render empty once neo3fura_http is removed.
          try {
            const [indexerRes, summary] = await Promise.all([
              indexerReadService.getTransactions(limit, skip, cacheOpts),
              indexerReadService.getSummary(cacheOpts).catch(() => null),
            ]);
            const rows = Array.isArray(indexerRes?.data) ? indexerRes.data : [];
            if (rows.length > 0) {
              const totalFromSummary = Number(summary?.total_tx_count);
              return {
                result: rows.map(this._mapIndexerTx),
                totalCount: Number(
                  indexerRes?.paging?.total
                    ?? (Number.isFinite(totalFromSummary) && totalFromSummary > 0 ? totalFromSummary : skip + rows.length),
                ),
              };
            }
          } catch { /* fall through to legacy */ }
          return safeRpcList("GetTransactionList", { Limit: limit, Skip: skip }, "get transaction list", cacheOpts);
        },
        CACHE_TTL.chart,
        cacheOpts,
      );

      if (!res || !res.result) return res;

      const enriched = await Promise.all(
        res.result.map(async (tx) => {
          if (enrichMissingFields && !this._extractVmState(tx) && tx.hash) {
            try {
              const full = await this.getByHash(tx.hash, requestOptions);
              const vmState = this._extractVmState(full);
              if (vmState) return { ...tx, vmstate: vmState };
            } catch (e) {
              if (import.meta.env.DEV) console.warn("[transactionService] vmstate enrichment failed:", e);
            }
          }
          return tx;
        }),
      );
      return { ...res, result: enriched };
    },

    // Map the indexer's snake_case TransactionListItem to the legacy field
    // names the UI components expect (TransactionTable, TransactionRow, etc.).
    // Spreads the original first so callers can still access snake_case if
    // they prefer it.
    _mapIndexerTx(tx = {}) {
      return {
        ...tx,
        hash: tx.hash || tx.txid || "",
        blockindex: tx.blockindex ?? tx.block_index,
        blocktime: tx.blocktime ?? tx.block_time_ms ?? 0,
        sender: tx.sender || tx.sender_address || "",
        sysfee: tx.sysfee ?? tx.sys_fee ?? 0,
        netfee: tx.netfee ?? tx.net_fee ?? 0,
        validUntilBlock: tx.validUntilBlock ?? tx.valid_until_block,
        contractHash: tx.contractHash || tx.contract_hash || "",
        vmstate: tx.vmstate || tx.vm_state || "",
      };
    },

    async getByAddress(address, limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = false, ...requestOptions } = options;

      // Prefer the indexer's per-account transaction list — the legacy
      // GetRawTransactionByAddress RPC returns empty for many wallets
      // even when the indexer has full coverage.
      let response = null;
      try {
        const indexerRes = await indexerReadService.getAccountTransactions(address, limit, skip, requestOptions);
        if (Array.isArray(indexerRes?.data) && indexerRes.data.length > 0) {
          // Pagination total: prefer the indexer's explicit `paging.total`
          // when present; else (offset + count + 1) so Next stays enabled
          // until we hit a short page.
          const fallbackTotal = indexerRes.data.length === limit
            ? skip + indexerRes.data.length + 1
            : skip + indexerRes.data.length;
          const total = Number(indexerRes?.paging?.total ?? fallbackTotal);
          response = {
            result: indexerRes.data.map((row) => ({
              hash: row.txid,
              txid: row.txid,
              blockindex: row.block_index,
              blockIndex: row.block_index,
              blocktime: row.block_time_ms,
              timestamp: row.block_time_ms,
              sender: row.sender_address,
              sender_address: row.sender_address,
              sysfee: row.sys_fee,
              netfee: row.net_fee,
              vmstate: row.vmstate || row.vm_state,
            })),
            totalCount: total,
          };
        }
      } catch {
        // Indexer unavailable — fall through to RPC.
      }

      if (!response) {
        const res = await this._getByAddress(address, limit, skip, requestOptions);
        if (!res || !res.result) return res;
        response = res;
        if (Array.isArray(res.result) && res.result.length === 0 && Number(res.totalCount || 0) === 0) {
          try {
            const transferFallback = await this._getAddressTransactionsFromTransferFallback(
              address,
              limit,
              skip,
              requestOptions,
            );
            if (transferFallback?.result?.length) {
              response = transferFallback;
            }
          } catch (error) {
            // Keep primary response when fallback retrieval fails.
          }
        }
      }

      const enriched = await Promise.all(
        response.result.map(async (tx) => {
          if (enrichMissingFields && !this._extractVmState(tx) && tx.hash) {
            try {
              const full = await this.getByHash(tx.hash, requestOptions);
              const vmState = this._extractVmState(full);
              if (vmState) return { ...tx, vmstate: vmState };
            } catch (e) {
              if (import.meta.env.DEV) console.warn("[transactionService] vmstate enrichment failed:", e);
            }
          }
          return tx;
        }),
      );
      return { ...response, result: enriched };
    },
  },
);

export default transactionService;
