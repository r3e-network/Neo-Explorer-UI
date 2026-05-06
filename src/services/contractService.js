import axios from "axios";
import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { indexerReadService } from "./indexerReadService";
import { getCurrentEnv } from "@/utils/env";

// state_json arrives from the indexer as a JSON-encoded string; the
// table renderer expects the parsed object. Fall back to the original
// string if it's malformed so the row still surfaces.
function tryParseStateJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Contract Service - Neo3 合约相关 API 调用
 * @module services/contractService
 * @description 通过 neo3fura 后端获取智能合约数据
 */

export const contractService = createService(
  {
    getCount: {
      cacheKey: "contract_count",
      rpcMethod: "GetContractCount",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({}),
    },
    getList: {
      _type: "list",
      cacheKey: "contract_list",
      rpcMethod: "GetContractList",
      errorLabel: "get contract list",
      ttl: CACHE_TTL.contract,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    getByHash: {
      cacheKey: "contract_hash",
      rpcMethod: "GetContractByContractHash",
      fallback: null,
      ttl: CACHE_TTL.contract,
      buildParams: ([hash]) => ({ ContractHash: hash }),
      buildCacheParams: ([hash]) => ({ hash }),
    },
    searchByName: {
      _type: "list",
      cacheKey: "contract_search",
      rpcMethod: "GetContractListByName",
      errorLabel: "search contracts",
      ttl: CACHE_TTL.contract,
      buildParams: ([name, limit = 20, skip = 0]) => ({ Name: name, Limit: limit, Skip: skip }),
      buildCacheParams: ([name, limit = 20, skip = 0]) => ({ name, limit, skip }),
    },
    getVerifiedByHash: {
      cacheKey: "contract_verified",
      rpcMethod: "GetVerifiedContractByContractHash",
      fallback: null,
      ttl: CACHE_TTL.contract,
      buildParams: ([hash, updateCounter = 0]) => ({ ContractHash: hash, UpdateCounter: updateCounter }),
      buildCacheParams: ([hash, updateCounter = 0]) => ({ hash, updateCounter }),
    },
    getVerifiedList: {
      _type: "list",
      cacheKey: "contract_verified_list",
      rpcMethod: "GetVerifiedContracts",
      errorLabel: "get verified contracts",
      ttl: CACHE_TTL.contract,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    getScCalls: {
      _type: "list",
      cacheKey: "contract_sc_calls",
      rpcMethod: "GetScCallByContractHash",
      errorLabel: "get SC calls",
      ttl: CACHE_TTL.chart,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ ContractHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },
    getNotifications: {
      _type: "list",
      cacheKey: "contract_notifications",
      rpcMethod: "GetNotificationByContractHash",
      errorLabel: "get contract notifications",
      ttl: CACHE_TTL.chart,
      buildParams: ([hash, limit = 20, skip = 0]) => ({ ContractHash: hash, Limit: limit, Skip: skip }),
      buildCacheParams: ([hash, limit = 20, skip = 0]) => ({ hash, limit, skip }),
    },
    invokeRead: {
      cacheKey: "contract_invoke_read",
      rpcMethod: "invokefunction",
      fallback: null,
      ttl: CACHE_TTL.contract,
      buildParams: ([hash, operation, args = []]) => [hash, operation, args],
      buildCacheParams: ([hash, operation, args = []]) => ({ hash, operation, args }),
    },
  },
  {
    // Override the auto-generated getNotifications: route through the
    // indexer REST endpoint, which has actual data, then fall back to
    // the legacy RPC when the indexer is unreachable.
    // Override getScCalls — same Mongo→Postgres pattern as #150/#152/#153.
    // Legacy GetScCallByContractHash queries an unpopulated Mongo collection.
    // Derive contract calls from the indexer's contract_notifications stream:
    // distinct txid+contract_hash rows are the unique invocations of this
    // contract. Sender comes from transaction_signers (first signer per tx).
    async getScCalls(hash, limit = 20, skip = 0, options = {}) {
      try {
        const network = (() => {
          const env = String(getCurrentEnv() || "").toLowerCase();
          return env.includes("test") || env.includes("t5") ? "testnet" : "mainnet";
        })();
        // Fetch the page of notifications, the per-contract overview (for
        // the authoritative tx_count), and signers in parallel.
        const [indexerRes, overviewRes] = await Promise.all([
          indexerReadService.getContractNotifications(
            hash,
            // Pull a wider window because we dedup by txid (contracts often
            // emit several notifications per call).
            Math.max(limit * 4, 100),
            skip,
            options,
          ),
          fetch(`/data/${network}/contracts/${encodeURIComponent(hash)}`, {
            headers: { Accept: "application/json" },
          }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        const authoritativeTxCount = Number(overviewRes?.data?.tx_count);
        const rows = Array.isArray(indexerRes?.data) ? indexerRes.data : [];
        if (rows.length === 0) {
          return safeRpcList(
            "GetScCallByContractHash",
            { ContractHash: hash, Limit: limit, Skip: skip },
            "get SC calls",
            options,
          );
        }
        // Dedup by txid, keeping the first notification per tx for the
        // event_name display.
        const seen = new Set();
        const calls = [];
        for (const row of rows) {
          if (!row?.txid || seen.has(row.txid)) continue;
          seen.add(row.txid);
          calls.push({
            txid: row.txid,
            blockindex: row.block_index,
            method: row.event_name || "—",
            callFlags: "",
            // originSender is fetched in a second pass below.
            originSender: null,
          });
          if (calls.length >= limit) break;
        }
        // Resolve senders in a single batched query against the indexer's
        // transaction_signers REST table (txid IN (...)). One round-trip
        // for the whole page rather than N individual getrawtransaction
        // calls. Failures fall through to originSender=null — the table
        // then renders "(null sender)" instead of breaking.
        try {
          const network = (() => {
            const env = String(getCurrentEnv() || "").toLowerCase();
            return env.includes("test") || env.includes("t5") ? "testnet" : "mainnet";
          })();
          const txids = calls.map((c) => c.txid).filter(Boolean);
          if (txids.length > 0) {
            const params = new URLSearchParams({
              select: "txid,account,position",
              network: `eq.${network}`,
              txid: `in.(${txids.join(",")})`,
              order: "position.asc",
            });
            const r = await fetch(`/rest/${network}/transaction_signers?${params}`, {
              headers: { Accept: "application/json" },
            });
            if (r.ok) {
              const rows = await r.json();
              const senderByTxid = new Map();
              for (const row of (Array.isArray(rows) ? rows : [])) {
                if (row?.txid && !senderByTxid.has(row.txid)) {
                  senderByTxid.set(row.txid, row.account);
                }
              }
              for (const call of calls) {
                if (senderByTxid.has(call.txid)) call.originSender = senderByTxid.get(call.txid);
              }
            }
          }
        } catch { /* keep null senders */ }
        return {
          result: calls,
          totalCount: Number.isFinite(authoritativeTxCount) && authoritativeTxCount > 0
            ? authoritativeTxCount
            : Number(
                indexerRes?.paging?.total
                  ?? (rows.length === Math.max(limit * 4, 100) ? skip + limit + 1 : skip + calls.length),
              ),
        };
      } catch {
        // Indexer down — let legacy RPC try (will return empty, but at
        // least the page renders without crashing).
      }
      return safeRpcList(
        "GetScCallByContractHash",
        { ContractHash: hash, Limit: limit, Skip: skip },
        "get SC calls",
        options,
      );
    },

    async getNotifications(hash, limit = 20, skip = 0, options = {}) {
      try {
        const indexerRes = await indexerReadService.getContractNotifications(hash, limit, skip, options);
        if (Array.isArray(indexerRes?.data) && indexerRes.data.length > 0) {
          return {
            result: indexerRes.data.map((row) => ({
              txid: row.txid,
              hash: row.txid,
              eventname: row.event_name,
              event_name: row.event_name,
              blockindex: row.block_index,
              blockIndex: row.block_index,
              // Legacy RPC field name kept for the table renderer.
              index: row.block_index,
              executionindex: row.execution_index,
              notificationindex: row.notification_index,
              state: tryParseStateJson(row.state_json),
              vmstate: row.vmstate || row.vm_state || "HALT",
              // Capital-V alias because EventsTable reads item.Vmstate.
              Vmstate: row.vmstate || row.vm_state || "HALT",
              time: row.block_time_ms,
              timestamp: row.block_time_ms,
            })),
            totalCount: Number(
              indexerRes?.paging?.total
                ?? (indexerRes.data.length === limit ? skip + indexerRes.data.length + 1 : skip + indexerRes.data.length),
            ),
          };
        }
      } catch {
        // Indexer down — let legacy RPC try.
      }
      return safeRpcList("GetNotificationByContractHash", { ContractHash: hash, Limit: limit, Skip: skip }, "get contract notifications", options);
    },

    async getListWithFallback(limit = 20, skip = 0, { search = "", forceRefresh = false } = {}) {
      const legacy = search
        ? await contractService.searchByName(search, limit, skip, { forceRefresh }).catch(() => null)
        : await contractService.getList(limit, skip, { forceRefresh }).catch(() => null);

      if (Array.isArray(legacy?.result) && legacy.result.length > 0) {
        return legacy;
      }

      const payload = await indexerReadService.getContracts(limit, skip, { search, forceRefresh });
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      return {
        result: rows.map((item) => ({
          hash: item.contract_hash,
          name: item.display_name || item.contract_hash,
          manifest: { supportedstandards: Array.isArray(item.standards) ? item.standards : [] },
          totalsccall: item.tx_count || 0,
          verified: Boolean(item.verified),
          createtime: item.created_at_ms || 0,
        })),
        totalCount: Number(payload?.paging?.total || rows.length || 0),
      };
    },

    async getChainStateByHash(hash, options = {}) {
      const key = getCacheKey("contract_chain_state", { hash });
      return cachedRequest(
        key,
        () => safeRpc("getcontractstate", [hash], null, options),
        CACHE_TTL.contract,
        options
      );
    },

    async getByHashWithFallback(hash, options = {}) {
      // Fetch in parallel: legacy fura row, on-chain state, and the
      // indexer's per-contract overview (the only source with the real
      // tx_count for the Invocations stat).
      const network = (() => {
        const env = String(getCurrentEnv() || "").toLowerCase();
        return env.includes("test") || env.includes("t5") ? "testnet" : "mainnet";
      })();
      const [indexedContract, chainState, overview] = await Promise.all([
        contractService.getByHash(hash, options),
        this.getChainStateByHash(hash, options),
        fetch(`/data/${network}/contracts/${encodeURIComponent(hash)}`, {
          headers: { Accept: "application/json" },
        }).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);
      const indexerOverview = overview?.data || null;
      // tx_count from /data/<network>/contracts/<hash> is the
      // authoritative invocation count; the legacy row's totalsccall
      // is 0 because the Mongo collection isn't populated.
      const totalsccall = Number(indexerOverview?.tx_count);

      const mergeIndexerExtras = (base) => {
        if (!base) return base;
        const out = { ...base };
        if (Number.isFinite(totalsccall) && totalsccall > 0) out.totalsccall = totalsccall;
        return out;
      };

      if (indexedContract?.hash && !chainState?.hash) return mergeIndexerExtras(indexedContract);
      if (!indexedContract?.hash && !chainState?.hash) {
        return indexerOverview
          ? mergeIndexerExtras({
              hash,
              name: indexerOverview.manifest_name || hash,
              manifest: { name: indexerOverview.manifest_name },
              updatecounter: indexerOverview.update_counter,
            })
          : null;
      }

      if (indexedContract?.hash && chainState?.hash) {
        return mergeIndexerExtras({
          ...indexedContract,
          ...chainState,
          name: indexedContract?.name || chainState?.manifest?.name || chainState?.name || hash,
          manifest: indexedContract?.manifest || chainState?.manifest || null,
        });
      }

      return mergeIndexerExtras({
        ...chainState,
        name: chainState?.manifest?.name || chainState?.name || hash,
      });
    },

    /**
     * 获取合约 manifest（带缓存，极少变更）
     * Calls getByHash internally — cannot be expressed as a single RPC config.
     * @param {string} hash - 合约哈希
     * @returns {Promise<Object|null>} manifest 数据
     */
    async getManifest(hash, options = {}) {
      const key = getCacheKey("contract_manifest", { hash });
      return cachedRequest(
        key,
        async () => {
          const contract = await contractService.getByHashWithFallback(hash, options);
          if (contract?.manifest && typeof contract.manifest === "string") {
            try {
              return JSON.parse(contract.manifest);
            } catch (e) {
              if (import.meta.env.DEV) console.error("Failed to parse manifest for", hash, e);
              return null;
            }
          }
          return contract?.manifest ?? null;
        },
        CACHE_TTL.contract,
        options
      );
    },

    /**
     * 上传合约源码进行验证
     * Uses axios POST to an external node — not an RPC call.
     * @param {string} nodeUrl - 验证节点 URL
     * @param {FormData} formData - 包含源码文件和合约信息的 FormData
     * @returns {Promise<Object>} 验证结果
     */
    async uploadVerification(nodeUrl, formData) {
      const ALLOWED_HOSTS = ["n3magnet.xyz", "ngd.network"];
      try {
        const host = new URL(nodeUrl).hostname;
        if (!ALLOWED_HOSTS.some((d) => host === d || host.endsWith("." + d))) {
          throw new Error("Verification node URL not in allowlist");
        }
      } catch (e) {
        if (e.message.includes("allowlist")) throw e;
        throw new Error("Invalid verification node URL");
      }
      try {
        const { data } = await axios.post(nodeUrl, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
        return data;
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[contractService] uploadVerification failed:", err);
        }
        throw err;
      }
    },
  }
);

export default contractService;
