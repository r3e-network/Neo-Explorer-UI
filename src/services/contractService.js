import axios from "axios";
import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { indexerReadService } from "./indexerReadService";
import { resolveNetworkName } from "@/utils/env";

const unsupportedContractCallsRestNetworks = new Set();

function shouldUseContractCallsRest(options = {}) {
  return Boolean(options.enableContractCallsRest || import.meta.env.VITE_ENABLE_CONTRACT_CALLS_REST === "true");
}

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
    // Contract calls come from the read-api, with a notification-derived
    // fallback when the dedicated REST table is unavailable.
    //
    // Tries two sources in order:
    //   1. The new /rest/v1/contract_calls endpoint (single round-trip).
    //   2. The contract_notifications + transaction_signers derivation
    //      (works against any current read-api; what we shipped first).
    async getScCalls(hash, limit = 20, skip = 0, options = {}) {
      const network = resolveNetworkName();
      // Pull the per-contract overview in parallel with the calls request
      // for an authoritative total tx_count regardless of which source wins.
      // Goes through indexerReadService so concurrent ContractDetail mount
      // paths (header + ScCallTable) collapse to one /contracts/<hash> hit.
      const overviewPromise = indexerReadService.getContractOverview(hash, options).catch(() => null);

      // Source 1: the new dedicated REST endpoint.
      if (shouldUseContractCallsRest(options) && !unsupportedContractCallsRestNetworks.has(network)) {
        try {
          const params = new URLSearchParams({
            network: `eq.${network}`,
            contract_hash: `eq.${hash}`,
            limit: String(limit),
            offset: String(skip),
          });
          const [restRes, overview] = await Promise.all([
            fetch(`/rest/${network}/contract_calls?${params}`, { headers: { Accept: "application/json" } }),
            overviewPromise,
          ]);
          if (restRes.ok) {
            const rows = await restRes.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const authoritativeTxCount = Number(overview?.tx_count);
              return {
                result: rows.map((r) => ({
                  txid: r.txid,
                  blockindex: r.block_index,
                  method: r.first_event_name || "—",
                  callFlags: "",
                  originSender: r.origin_sender || null,
                })),
                totalCount: Number.isFinite(authoritativeTxCount) && authoritativeTxCount > 0
                  ? authoritativeTxCount
                  : skip + rows.length + (rows.length === limit ? 1 : 0),
              };
            }
          }
          if (restRes.status === 404) {
            unsupportedContractCallsRestNetworks.add(network);
          }
          // 404 here means the read-api hasn't been redeployed yet with
          // the new endpoint. Fall through to source 2.
        } catch { /* network error; fall through */ }
      }

      // Source 2: derive client-side from contract_notifications + signers.
      try {
        // Same slow-endpoint accommodation as tokenService.getNep17Transfers.
        const slowOptions = { ...options, timeoutMs: 12000 };
        const [indexerRes, overview] = await Promise.all([
          indexerReadService.getContractNotifications(
            hash,
            Math.max(limit * 4, 100),
            skip,
            slowOptions,
          ),
          overviewPromise,
        ]);
        const authoritativeTxCount = Number(overview?.tx_count);
        const rows = Array.isArray(indexerRes?.data) ? indexerRes.data : [];
        if (rows.length === 0) {
          return { result: [], totalCount: 0 };
        }
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
            originSender: null,
          });
          if (calls.length >= limit) break;
        }
        try {
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
              const signerRows = await r.json();
              const senderByTxid = new Map();
              for (const row of (Array.isArray(signerRows) ? signerRows : [])) {
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
      } catch { /* fall through to empty state */ }

      return { result: [], totalCount: 0 };
    },

    async getNotifications(hash, limit = 20, skip = 0, options = {}) {
      try {
        // /contracts/<hash>/notifications takes 2-4s for high-traffic
        // contracts (NEO/GAS); the default 3s timeout reliably aborts
        // and leaves the EventsTable empty. See tokenService.getNep17Transfers
        // for the same fix.
        const slowOptions = { ...options, timeoutMs: 12000 };
        const indexerRes = await indexerReadService.getContractNotifications(hash, limit, skip, slowOptions);
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
        // Indexer down — fall through to empty state.
      }
      return { result: [], totalCount: 0 };
    },

    async getListWithFallback(limit = 20, skip = 0, { search = "", forceRefresh = false } = {}) {
      // Indexer first — same Mongo-to-Postgres pattern as #171/#172.
      try {
        const payload = await indexerReadService.getContracts(limit, skip, { search, forceRefresh });
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        if (rows.length > 0) {
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
        }
      } catch { /* fall through to empty state */ }

      return { result: [], totalCount: 0 };
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
      // Fetch in parallel: on-chain state (canonical) and the indexer's
      // per-contract overview (authoritative tx_count).
      const [chainState, indexerOverview] = await Promise.all([
        this.getChainStateByHash(hash, options),
        indexerReadService.getContractOverview(hash, options).catch(() => null),
      ]);
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

      if (chainState?.hash) {
        return mergeIndexerExtras({
          ...chainState,
          name: chainState?.manifest?.name || chainState?.name || hash,
        });
      }

      if (indexerOverview) {
        return mergeIndexerExtras({
          hash,
          name: indexerOverview.manifest_name || hash,
          manifest: { name: indexerOverview.manifest_name },
          updatecounter: indexerOverview.update_counter,
        });
      }

      return null;
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
        const url = new URL(nodeUrl);
        if (url.protocol !== "https:") {
          throw new Error("Verification node URL must use https");
        }
        const host = url.hostname;
        if (!ALLOWED_HOSTS.some((d) => host === d || host.endsWith("." + d))) {
          throw new Error("Verification node URL not in allowlist");
        }
      } catch (e) {
        if (e.message.includes("allowlist") || e.message.includes("https")) throw e;
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
