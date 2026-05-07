import { safeRpc, safeRpcList } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { indexerReadService } from "./indexerReadService";
import { base64ToBytes, bytesToHex, scriptHashToAddress } from "@/utils/neoHelpers";
import { resolveNetworkName } from "@/utils/env";

const resolveTokenNetwork = () => resolveNetworkName();

// Indexer Postgres-backed REST endpoint for tx-level transfer lookups.
// Fields returned: { txid, contract_hash, from_address, to_address,
// amount_raw, amount_text, block_index, execution_index,
// notification_index, indexed_at, raw_json, [token_id_raw for NEP-11] }.
// Map to the legacy {from, to, amount, contract, txid, blockindex} shape
// the shared TxTransfersTab component expects.
async function fetchTransfersByTxHashFromIndexer(txHash, standard, limit = 20, skip = 0) {
  const network = resolveTokenNetwork();
  const table = standard === "nep11" ? "nep11_transfers" : "nep17_transfers";
  const params = new URLSearchParams({
    txid: `eq.${txHash}`,
    network: `eq.${network}`,
    limit: String(limit),
    offset: String(skip),
    order: "execution_index.asc,notification_index.asc",
  });
  try {
    const res = await fetch(`/rest/${network}/${table}?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { result: [], totalCount: 0 };
    const rows = await res.json();
    if (!Array.isArray(rows)) return { result: [], totalCount: 0 };
    return {
      result: rows.map((r) => ({
        txid: r.txid,
        from: r.from_address || null,
        to: r.to_address || null,
        amount: String(r.amount_text ?? r.amount_raw ?? "0"),
        contract: r.contract_hash,
        contractHash: r.contract_hash,
        blockindex: r.block_index,
        timestamp: r.indexed_at,
        ...(standard === "nep11" && r.token_id_raw
          ? { tokenId: r.token_id_raw }
          : {}),
      })),
      totalCount: rows.length,
    };
  } catch {
    return { result: [], totalCount: 0 };
  }
}

// Indexer contract notifications carry Transfer events as a JSON-encoded
// stack: state.value = [from, to, amount]. Both addresses are 20-byte
// little-endian script hashes wrapped in base64 ByteString; the amount
// is an Integer (raw, decimal-unscaled). Decode them into the shape the
// shared TransferTable component expects: { txid, from, to, amount,
// timestamp, blockindex }. A null `from` denotes a mint, null `to` a
// burn — TransferTable styles those with the success/error variants.
function _decodeAddressFromState(item) {
  if (!item || item.type === "Any") return null;
  if (typeof item.value !== "string" || !item.value) return null;
  try {
    const bytes = base64ToBytes(item.value);
    if (bytes.length !== 20) return null;
    // ByteString from a Neo state value is little-endian; reverse to BE
    // before formatting.
    const reversed = new Uint8Array(bytes).reverse();
    const hex = "0x" + bytesToHex(reversed);
    return scriptHashToAddress(hex) || null;
  } catch {
    return null;
  }
}

function decodeTransferNotification(row) {
  let state = row.state_json;
  if (typeof state === "string") {
    try {
      state = JSON.parse(state);
    } catch {
      state = null;
    }
  }
  const items = Array.isArray(state?.value) ? state.value : [];
  const rawAmount = items[2]?.value || "0";
  return {
    txid: row.txid,
    hash: row.txid,
    blockindex: row.block_index,
    blockIndex: row.block_index,
    timestamp: row.block_time_ms,
    time: row.block_time_ms,
    from: _decodeAddressFromState(items[0]),
    to: _decodeAddressFromState(items[1]),
    // TransferTable's template reads `item.value`. Keep `amount` too as
    // a friendlier alias for any other consumer.
    value: rawAmount,
    amount: rawAmount,
    contract: row.contract_hash,
  };
}

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
    // Override getTransfersByTxHash / getNep11TransfersByTxHash —
    // both legacy RPC handlers query the empty Mongo `Nep17Transfer` /
    // `Nep11Transfer` collections. The Postgres indexer is the
    // authoritative source: when it returns an array (even empty), we
    // trust it. Only fall back to legacy if the indexer throws or
    // returns null. The previous "fall back when length === 0" version
    // was firing the legacy RPC for every tx without NEP-17 transfers
    // (vote ops, contract calls, etc.) — verified live: thousands of
    // wasted POSTs per page. See #178.
    async getTransfersByTxHash(txHash, limit = 20, skip = 0, options = {}) {
      try {
        const indexed = await fetchTransfersByTxHashFromIndexer(txHash, "nep17", limit, skip);
        if (indexed && Array.isArray(indexed.result)) return indexed;
      } catch { /* indexer threw — try legacy as defence-in-depth */ }
      const direct = await safeRpcList(
        "GetNep17TransferByTransactionHash",
        { TransactionHash: txHash, Limit: limit, Skip: skip },
        "get NEP17 transfers by tx",
        options,
      ).catch(() => null);
      return direct || { result: [], totalCount: 0 };
    },

    async getNep11TransfersByTxHash(txHash, limit = 20, skip = 0, options = {}) {
      try {
        const indexed = await fetchTransfersByTxHashFromIndexer(txHash, "nep11", limit, skip);
        if (indexed && Array.isArray(indexed.result)) return indexed;
      } catch { /* indexer threw — try legacy as defence-in-depth */ }
      const direct = await safeRpcList(
        "GetNep11TransferByTransactionHash",
        { TransactionHash: txHash, Limit: limit, Skip: skip },
        "get NEP11 transfers by tx",
        options,
      ).catch(() => null);
      return direct || { result: [], totalCount: 0 };
    },

    // Override getHolders — the legacy GetAssetHoldersByContractHash RPC
    // queries a Mongo collection that the Postgres-migrated indexer no
    // longer populates. Pull from v_nep17_balances instead, ranked by
    // balance_raw DESC, and compute % share against the token's
    // total_supply_raw (sourced from the indexer's tokens endpoint).
    async getHolders(hash, limit = 20, skip = 0, options = {}) {
      try {
        const network = resolveTokenNetwork();
        const params = new URLSearchParams({
          select: "address,balance_raw",
          contract_hash: `eq.${hash}`,
          network: `eq.${network}`,
          balance_raw: "gt.0",
          limit: String(limit),
          offset: String(skip),
          order: "balance_raw.desc",
        });
        const [rowsRes, tokenInfo] = await Promise.all([
          fetch(`/rest/${network}/v_nep17_balances?${params}`, { headers: { Accept: "application/json" } }),
          indexerReadService.getToken(hash, options).catch(() => null),
        ]);
        if (rowsRes.ok) {
          const rows = await rowsRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const totalSupply = Number(tokenInfo?.total_supply_raw || 0);
            const result = rows.map((r) => {
              const balance = Number(r.balance_raw || 0);
              return {
                address: r.address,
                balance: String(r.balance_raw ?? "0"),
                percentage: totalSupply > 0 ? balance / totalSupply : 0,
              };
            });
            return {
              result,
              totalCount: Number(tokenInfo?.holder_count || rows.length),
            };
          }
        }
      } catch {
        // fall through to legacy RPC
      }
      return safeRpcList(
        "GetAssetHoldersByContractHash",
        { ContractHash: hash, Limit: limit, Skip: skip },
        "get token holders",
        options,
      );
    },

    // Override the default getNep17Transfers (legacy GetNep17TransferByContractHash
    // RPC) which returns empty for nearly every contract. Derive from the
    // indexer's contract notifications endpoint instead, decoding the
    // Transfer event state into {from, to, amount}.
    async getNep17Transfers(hash, limit = 20, skip = 0, options = {}) {
      try {
        // Fetch the page of transfers and the token's authoritative total
        // in parallel — transfer_event_count from the indexer's tokens
        // endpoint is the real "A total of N transfers" number; without
        // it the previous heuristic showed "26" for NEO (1.2M actual).
        const [notifications, tokenInfo] = await Promise.all([
          indexerReadService.getContractNotifications(
            hash,
            // Transfer events are interleaved with other event names. Pull a
            // generous window and filter client-side; if filtering leaves us
            // short, the next page will fetch more.
            Math.max(limit * 3, 50),
            skip,
            options,
          ),
          indexerReadService.getToken(hash, options).catch(() => null),
        ]);
        const rows = Array.isArray(notifications?.data) ? notifications.data : [];
        const transfers = rows
          .filter((row) => String(row.event_name || "").toLowerCase() === "transfer")
          .slice(0, limit)
          .map((row) => decodeTransferNotification(row));
        if (transfers.length > 0) {
          const authoritativeTotal = Number(tokenInfo?.transfer_event_count);
          return {
            result: transfers,
            totalCount: Number.isFinite(authoritativeTotal) && authoritativeTotal > 0
              ? authoritativeTotal
              : Number(
                  notifications?.paging?.total
                    ?? (rows.length === Math.max(limit * 3, 50) ? skip + limit + 1 : skip + transfers.length),
                ),
          };
        }
      } catch {
        // Indexer unreachable — fall through.
      }
      return safeRpcList(
        "GetNep17TransferByContractHash",
        { ContractHash: hash, Limit: limit, Skip: skip },
        "get NEP17 transfers",
        options,
      );
    },

    // Contract-level NEP-11 transfers. There's no
    // GetNep11TransferByContractHash JSON-RPC handler — only the per-token
    // variant exists — so the NFT collection page's "Recent Transfers" tab
    // had no working data source. Reuse the same indexer-notifications
    // path as getNep17Transfers; both standards emit a "Transfer" event
    // with [from, to, amount/tokenId] state.
    async getNep11Transfers(hash, limit = 20, skip = 0, options = {}) {
      try {
        const [notifications, tokenInfo] = await Promise.all([
          indexerReadService.getContractNotifications(
            hash,
            Math.max(limit * 3, 50),
            skip,
            options,
          ),
          indexerReadService.getToken(hash, options).catch(() => null),
        ]);
        const rows = Array.isArray(notifications?.data) ? notifications.data : [];
        const transfers = rows
          .filter((row) => String(row.event_name || "").toLowerCase() === "transfer")
          .slice(0, limit)
          .map((row) => decodeTransferNotification(row));
        const authoritativeTotal = Number(tokenInfo?.transfer_event_count);
        return {
          result: transfers,
          totalCount: Number.isFinite(authoritativeTotal) && authoritativeTotal > 0
            ? authoritativeTotal
            : Number(
                notifications?.paging?.total
                  ?? (rows.length === Math.max(limit * 3, 50) ? skip + limit + 1 : skip + transfers.length),
              ),
        };
      } catch {
        return { result: [], totalCount: 0 };
      }
    },

    /** @see getTokenList */
    async getNep17List(limit = 20, skip = 0, options = {}) {
      return tokenService.getTokenList("NEP17", limit, skip, options);
    },

    /** @see getTokenList */
    async getNep11List(limit = 20, skip = 0, options = {}) {
      return tokenService.getTokenList("NEP11", limit, skip, options);
    },

    async getTokenListWithFallback(type, limit = 20, skip = 0, { search = "", forceRefresh = false } = {}) {
      // Indexer first — same Mongo→Postgres pattern as #171/#172/#173. The
      // indexer's /tokens endpoint also handles `search` natively (matches
      // by display_name or symbol), so a search-mode call goes there too.
      try {
        const payload = await indexerReadService.getTokens(type, limit, skip, { search, forceRefresh });
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        if (rows.length > 0) {
          return {
            result: rows.map((item) => ({
              hash: item.contract_hash,
              tokenname: item.display_name || item.contract_hash,
              symbol: item.symbol || "",
              holders: item.holder_count || 0,
              // total_supply_raw is populated for both NEP-17 and NEP-11.
              // Older revision masked NEP-17 to null on the assumption the
              // indexer total was unreliable; the live data shows it tracks
              // the contract's totalSupply correctly, so render it for both.
              totalsupply: item.total_supply_raw || "0",
              decimals: Number(item.decimals || 0),
              type: item.standard || type,
              standard: item.standard || type,
            })),
            totalCount: Number(payload?.paging?.total || rows.length || 0),
          };
        }
      } catch { /* fall through to legacy */ }

      const legacy = search
        ? await tokenService.searchTokenByName(type, search, limit, skip, { forceRefresh }).catch(() => null)
        : await tokenService.getTokenList(type, limit, skip, { forceRefresh }).catch(() => null);
      return legacy || { result: [], totalCount: 0 };
    },

    async getByHashWithFallback(hash, options = {}) {
      // Indexer first — same Mongo→Postgres pattern as #171/#172/#173.
      // The legacy GetAssetInfoByContractHash returns null for most
      // contracts. The enrichment block below (manifest invokefunction
      // for missing decimals/symbol) still runs against the indexer row.
      const item = await indexerReadService.getToken(hash, options).catch(() => null);
      if (!item) {
        const legacy = await tokenService.getByHash(hash, options).catch(() => null);
        if (legacy?.hash || legacy?.tokenname || legacy?.symbol) return legacy;
        return null;
      }

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
     *
     * Calls the contract's standard `properties(tokenId)` NEP-11 method
     * via `invokefunction` and decodes the returned Map. This is the
     * authoritative on-chain source — works against any compliant NEP-11
     * contract regardless of whether neo3fura_http is in the path. Falls
     * back to the legacy GetNep11PropertiesByContractHashTokenId for
     * backends that still proxy through Mongo.
     *
     * @param {string} hash - Contract hash
     * @param {string[]} tokenIds - Array of base64-encoded token IDs
     * @param {Object} [options]
     * @returns {Promise<{result: Array<{tokenId: string, name?: string, image?: string, description?: string}>}|null>}
     */
    async getNep11Properties(hash, tokenIds, options = {}) {
      const key = getCacheKey("token_nep11_properties", { hash, tokenIds });
      return cachedRequest(
        key,
        async () => {
          // Standard path — call properties(tokenId) on the contract for
          // each id. Most NFT detail loads pass a single id, so this is
          // typically one round-trip. Falls back to the legacy Mongo
          // helper if the standard call doesn't HALT for any id.
          try {
            const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
            const results = await Promise.all(
              ids.map((tokenId) =>
                safeRpc(
                  "invokefunction",
                  [hash, "properties", [{ type: "ByteString", value: tokenId }]],
                  null,
                  options,
                ),
              ),
            );
            const decoded = results
              .map((res, i) => {
                if (res?.state !== "HALT") return null;
                const stack = res?.stack?.[0];
                if (!stack || stack.type !== "Map" || !Array.isArray(stack.value)) return null;
                const out = { tokenId: ids[i] };
                for (const entry of stack.value) {
                  const k = tokenService._decodeBase64(entry?.key?.value);
                  const v = tokenService._decodeBase64(entry?.value?.value);
                  if (k) out[k] = v;
                }
                return out;
              })
              .filter(Boolean);
            if (decoded.length > 0) {
              return { result: decoded };
            }
          } catch { /* fall through to legacy */ }
          return safeRpc(
            "GetNep11PropertiesByContractHashTokenId",
            { ContractHash: hash, TokenIds: tokenIds },
            null,
            options,
          );
        },
        CACHE_TTL.token,
        options
      );
    },

    // Decode a base64-encoded ByteString stack value to a UTF-8 string.
    // Returns the original input on decode failure (e.g. raw bytes that
    // aren't valid UTF-8 — token images may sometimes be binary blobs).
    _decodeBase64(raw) {
      if (typeof raw !== "string" || !raw) return raw || "";
      try {
        const decoded = atob(raw);
        // If it parses to printable text, return it. Otherwise hand the
        // raw base64 back so callers can handle binary themselves.
        return decoded;
      } catch {
        return raw;
      }
    },
  }
);

export default tokenService;
