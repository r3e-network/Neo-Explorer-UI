import { safeRpc } from "./api";
import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService, getRealtimeListCacheOptions } from "./serviceFactory";
import { indexerReadService } from "./indexerReadService";
import { base64ToBytes, bytesToHex, scriptHashToAddress } from "@/utils/neoHelpers";
import { resolveNetworkName } from "@/utils/env";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { eqHash, inHashes, safeTokenId } from "@/utils/postgrest";

const resolveTokenNetwork = (options = {}) => {
  const explicitNetwork = typeof options === "string" ? options : options?.network;
  return explicitNetwork ? resolveNetworkName(explicitNetwork) : resolveNetworkName();
};
const TOKEN_HOLDERS_FETCH_TIMEOUT_MS = Math.max(
  4_500,
  Number(import.meta.env.VITE_TOKEN_HOLDERS_FETCH_TIMEOUT_MS || 7_000),
);

function mapHolderBalanceRows(rows = [], totalSupplyRaw = 0) {
  const totalSupply = Number(totalSupplyRaw || 0);
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const balanceRaw = row?.balance_raw ?? row?.balanceRaw ?? row?.balance ?? "0";
    const balance = Number(balanceRaw || 0);
    return {
      address: row?.address || "",
      balance: String(balanceRaw ?? "0"),
      percentage: totalSupply > 0 && Number.isFinite(balance) ? balance / totalSupply : 0,
    };
  });
}

function bytesToBase64(bytes) {
  const normalized = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of normalized) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(normalized).toString("base64");
  }
  return "";
}

function utf8ToBase64(value) {
  const text = String(value ?? "");
  if (typeof TextEncoder !== "undefined") {
    return bytesToBase64(new TextEncoder().encode(text));
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64");
  }
  return bytesToBase64(Array.from(text, (char) => char.charCodeAt(0)));
}

function hexToBase64(value) {
  const hex = String(value || "").replace(/^0x/i, "");
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return "";
  const bytes = Uint8Array.from(hex.match(/../g).map((byte) => parseInt(byte, 16)));
  return bytesToBase64(bytes);
}

function isPaddedBase64(value) {
  const text = String(value || "").trim();
  if (!text || !/[=+/]/.test(text) || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return false;
  try {
    const normalized = text.replace(/=+$/, "");
    const decoded = atob(text);
    return btoa(decoded).replace(/=+$/, "") === normalized;
  } catch {
    return false;
  }
}

function encodeNep11TokenIdForRpc(tokenId) {
  const text = String(tokenId ?? "").trim();
  if (!text) return text;
  if (isPaddedBase64(text)) return text;

  const fromHex = hexToBase64(text);
  if (fromHex) return fromHex;

  return utf8ToBase64(text);
}

// Indexer Postgres-backed REST endpoint for tx-level transfer lookups.
// Fields returned: { txid, contract_hash, from_address, to_address,
// amount_raw, amount_text, block_index, execution_index,
// notification_index, indexed_at, raw_json, [token_id_raw for NEP-11] }.
// Map an indexer transfer row to the legacy shape the TxTransfersTab and
// useTransferSummary composable consume.
function _mapTransferRow(r, standard) {
  return {
    txid: r.txid,
    from: r.from_address || null,
    to: r.to_address || null,
    amount: String(r.amount_text ?? r.amount_raw ?? "0"),
    contract: r.contract_hash,
    contractHash: r.contract_hash,
    blockindex: r.block_index,
    // Prefer the numeric epoch fields the indexer emits (timestamp_ms /
    // block_time_ms) over the ISO `indexed_at` string — the latter sorts to
    // NaN under the Number()-based comparators downstream.
    timestamp: r.timestamp_ms ?? r.block_time_ms ?? r.indexed_at,
    ...(standard === "nep11" && r.token_id_raw
      ? { tokenId: r.token_id_raw }
      : {}),
  };
}

// Map to the legacy {from, to, amount, contract, txid, blockindex} shape
// the shared TxTransfersTab component expects.
async function fetchTransfersByTxHashFromIndexer(txHash, standard, limit = 20, skip = 0, options = {}) {
  const network = resolveTokenNetwork(options);
  const table = standard === "nep11" ? "nep11_transfers" : "nep17_transfers";
  const txidFilter = eqHash(txHash);
  const params = new URLSearchParams({
    txid: txidFilter,
    network: `eq.${network}`,
    limit: String(limit),
    offset: String(skip),
    order: "execution_index.asc,notification_index.asc",
  });
  try {
    const res = await fetchWithTimeout(`/rest/${network}/${table}?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { result: [], totalCount: 0 };
    const rows = await res.json();
    if (!Array.isArray(rows)) return { result: [], totalCount: 0 };
    return {
      result: rows.map((r) => _mapTransferRow(r, standard)),
      totalCount: rows.length,
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[tokenService] ${table} tx-hash indexer fetch failed for ${txHash}:`, err);
    }
    return { result: [], totalCount: 0 };
  }
}

// Batched variant of fetchTransfersByTxHashFromIndexer. Pulls transfers
// for many txids in one PostgREST query (txid=in.(...)) and buckets the
// rows by txid. Used by useTransferSummary on list pages where the
// per-row N+1 loop would otherwise fire 8+ separate fetches.
async function fetchTransfersByTxHashesBatchFromIndexer(txHashes, standard, options = {}) {
  const list = (Array.isArray(txHashes) ? txHashes : [])
    .map((h) => String(h || "").trim())
    .filter(Boolean);
  if (list.length === 0) return new Map();

  const network = resolveTokenNetwork(options);
  const table = standard === "nep11" ? "nep11_transfers" : "nep17_transfers";
  const txidInFilter = inHashes(list);
  if (!txidInFilter) return new Map();
  const params = new URLSearchParams({
    txid: txidInFilter,
    network: `eq.${network}`,
    // Per-row preview only needs a handful of rows per tx; oversize the
    // global cap so we don't truncate a high-event tx mid-result.
    limit: String(Math.min(list.length * 8, 200)),
    order: "execution_index.asc,notification_index.asc",
  });

  try {
    const res = await fetchWithTimeout(`/rest/${network}/${table}?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return new Map();
    const rows = await res.json();
    if (!Array.isArray(rows)) return new Map();

    const buckets = new Map();
    for (const txid of list) buckets.set(txid, []);
    for (const row of rows) {
      const bucket = buckets.get(row.txid);
      if (bucket) bucket.push(_mapTransferRow(row, standard));
    }
    return buckets;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[tokenService] ${table} batch indexer fetch failed:`, err);
    }
    return new Map();
  }
}

// Page a transfer-only population for a contract straight from the
// Postgres-indexed nep17_transfers / nep11_transfers REST table. Unlike the
// notifications endpoint (which interleaves Transfer rows with other event
// names, so an `offset` advances the *notification* window while the total
// counts only transfers — skipping/duplicating rows on busy contracts), this
// query filters to transfers up front: `offset` and the `count=exact` total
// share one filtered population. Returns null on transport failure so the
// caller can fall through to the notifications/legacy path.
async function fetchContractTransfersFromIndexer(hash, standard, limit, skip, options = {}) {
  const network = resolveTokenNetwork(options);
  const table = standard === "nep11" ? "nep11_transfers" : "nep17_transfers";
  const safeHash = encodeURIComponent(String(hash || "").trim());
  if (!safeHash) return null;
  const params = new URLSearchParams({
    contract_hash: `eq.${safeHash}`,
    network: `eq.${network}`,
    limit: String(limit),
    offset: String(skip),
    order: "block_index.desc,execution_index.desc,notification_index.desc",
  });
  try {
    const res = await fetchWithTimeout(`/rest/${network}/${table}?${params}`, {
      // Prefer: count=exact makes PostgREST return the true total of the
      // *filtered* population in the Content-Range header (e.g. "0-19/1543").
      headers: { Accept: "application/json", Prefer: "count=exact" },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    // Content-Range: items <start>-<end>/<total>. Parse the total off the
    // same filtered query that produced the page so offset + total agree.
    const contentRange = res.headers.get("Content-Range") || "";
    const totalFromHeader = Number(contentRange.split("/")[1]);
    const totalCount = Number.isFinite(totalFromHeader) && totalFromHeader >= 0
      ? totalFromHeader
      : skip + rows.length;
    return {
      result: rows.map((r) => _mapTransferRow(r, standard)),
      totalCount,
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[tokenService] ${table} indexer fetch failed for ${hash}:`, err);
    }
    return null;
  }
}

async function fetchNep11TransfersByTokenIdFromIndexer(hash, tokenId, limit = 20, skip = 0, options = {}) {
  const network = resolveTokenNetwork(options);
  const contractHashFilter = eqHash(hash);
  const cleanTokenId = safeTokenId(tokenId);
  if (!contractHashFilter || !cleanTokenId) return null;

  const params = new URLSearchParams({
    contract_hash: contractHashFilter,
    token_id_raw: `eq.${cleanTokenId}`,
    network: `eq.${network}`,
    limit: String(limit),
    offset: String(skip),
    order: "block_index.desc,execution_index.desc,notification_index.desc",
  });

  try {
    const res = await fetchWithTimeout(`/rest/${network}/nep11_transfers?${params}`, {
      headers: { Accept: "application/json", Prefer: "count=exact" },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const contentRange = res.headers.get("Content-Range") || "";
    const totalFromHeader = Number(contentRange.split("/")[1]);
    return {
      result: rows.map((r) => _mapTransferRow(r, "nep11")),
      totalCount: Number.isFinite(totalFromHeader) && totalFromHeader >= 0
        ? totalFromHeader
        : skip + rows.length,
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[tokenService] nep11 token-id transfer fetch failed for ${hash}/${tokenId}:`, err);
    }
    return null;
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

function _decodeNep11TokenId(item) {
  if (!item || item.type === "Any" || item.value == null) return undefined;
  // NEP-11 tokenId is typically a ByteString (base64-encoded raw bytes:
  // a domain name like "poseidon.neo", or some opaque hash) or an
  // Integer (numeric id). Surface the raw value as-is — the display
  // layer (TransferTable) decides whether to show base64 or stringify
  // bytes per contract.
  if (item.type === "ByteString") {
    try {
      return atob(String(item.value));
    } catch {
      return String(item.value);
    }
  }
  return String(item.value);
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
  // NEP-11 Transfer event signature is (from, to, amount, tokenId);
  // NEP-17's is (from, to, amount). items[3] is undefined for NEP-17,
  // which collapses the field to undefined — exactly what we want.
  const tokenId = _decodeNep11TokenId(items[3]);
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
    ...(tokenId !== undefined ? { tokenId, tokenid: tokenId } : {}),
  };
}

function _normalizeTokenStandard(value) {
  return String(value || "").trim().toUpperCase().replace("-", "");
}

function _standardsFromManifest(manifest) {
  const raw = manifest?.supportedstandards || manifest?.supportedStandards || [];
  return Array.isArray(raw) ? raw.map(_normalizeTokenStandard).filter(Boolean) : [];
}

function _tokenItemFromContractState(hash, state) {
  const standards = _standardsFromManifest(state?.manifest);
  const standard = standards.includes("NEP17") ? "NEP17" : standards.includes("NEP11") ? "NEP11" : "";
  if (!standard) return null;
  const contractHash = state?.hash || hash;
  const displayName = state?.manifest?.name || contractHash;
  return {
    contract_hash: contractHash,
    display_name: displayName,
    symbol: "",
    holder_count: 0,
    total_supply_raw: "0",
    decimals: 0,
    standard,
  };
}

/**
 * Token Service - Neo3 代币相关 API 调用
 * @module services/tokenService
 * @description 通过 neo3fura 后端获取 NEP17/NEP11 代币数据
 */

export const tokenService = createService(
  {},
  {
    async getTokenList(type, limit = 20, skip = 0, options = {}) {
      return this.getTokenListWithFallback(type, limit, skip, options);
    },

    async getByHash(hash, options = {}) {
      return this.getByHashWithFallback(hash, options);
    },

    // The Postgres indexer is the authoritative transfer source. When it
    // cannot answer, return an empty list rather than touching retired
    // transaction-hash handlers.
    async getTransfersByTxHash(txHash, limit = 20, skip = 0, options = {}) {
      try {
        const indexed = await fetchTransfersByTxHashFromIndexer(txHash, "nep17", limit, skip, options);
        if (indexed && Array.isArray(indexed.result)) return indexed;
      } catch { /* fall through to empty state */ }
      return { result: [], totalCount: 0 };
    },

    async getNep11TransfersByTxHash(txHash, limit = 20, skip = 0, options = {}) {
      try {
        const indexed = await fetchTransfersByTxHashFromIndexer(txHash, "nep11", limit, skip, options);
        if (indexed && Array.isArray(indexed.result)) return indexed;
      } catch { /* fall through to empty state */ }
      return { result: [], totalCount: 0 };
    },

    // Batch sibling of getTransfersByTxHash. Single PostgREST query for
    // many txids at once, returns Map<txid, transfers[]>. Pages that
    // render a list of transactions (Home, /transactions, address profile)
    // use this to replace per-row N+1 lookups. No legacy fallback — the
    // legacy RPC has no batch variant; on empty/error we just return an
    // empty Map and let callers degrade gracefully.
    async getTransfersByTxHashesBatch(txHashes, standard = "nep17", options = {}) {
      return fetchTransfersByTxHashesBatchFromIndexer(txHashes, standard, options);
    },

    async getNep11TransfersByTokenId(hash, tokenId, limit = 20, skip = 0, options = {}) {
      const indexed = await fetchNep11TransfersByTokenIdFromIndexer(hash, tokenId, limit, skip, options);
      return indexed || { result: [], totalCount: 0 };
    },

    // Pull the holder ranking from the indexer's token_holder_balances table
    // via the read-api holders endpoint.
    async getNftHoldersList(hash, limit = 20, skip = 0, options = {}) {
      try {
        const payload = await indexerReadService.getTokenHolders(hash, limit, skip, options);
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        if (payload && payload.data) {
          return {
            result: rows.map((r) => ({ address: r.address, balance: String(r.balance_raw ?? "0") })),
            totalCount: Number(payload?.meta?.total ?? rows.length),
          };
        }
      } catch {
        // fall through to the empty no-data state
      }
      return { result: [], totalCount: 0 };
    },

    // Pull from v_nep17_balances, ranked by balance_raw DESC, and compute
    // percentage share against total_supply_raw from the token endpoint.
    async getHolders(hash, limit = 20, skip = 0, options = {}) {
      const tokenInfoPromise = indexerReadService.getToken(hash, options).catch(() => null);
      try {
        const payload = await indexerReadService.getTokenHolders(hash, limit, skip, {
          ...options,
          timeoutMs: TOKEN_HOLDERS_FETCH_TIMEOUT_MS,
        });
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        if (payload && Array.isArray(payload.data) && (rows.length > 0 || Number(payload?.meta?.total || 0) > 0)) {
          const tokenInfo = await tokenInfoPromise;
          return {
            result: mapHolderBalanceRows(rows, tokenInfo?.total_supply_raw),
            totalCount: Number(payload?.meta?.total ?? tokenInfo?.holder_count ?? rows.length),
          };
        }
      } catch {
        // fall through to the REST balance view below
      }

      try {
        const network = resolveTokenNetwork(options);
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
          fetchWithTimeout(
            `/rest/${network}/v_nep17_balances?${params}`,
            { headers: { Accept: "application/json" } },
            TOKEN_HOLDERS_FETCH_TIMEOUT_MS,
          ),
          tokenInfoPromise,
        ]);
        if (rowsRes.ok) {
          const rows = await rowsRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            return {
              result: mapHolderBalanceRows(rows, tokenInfo?.total_supply_raw),
              totalCount: Number(tokenInfo?.holder_count || rows.length),
            };
          }
        }
      } catch {
        // fall through to empty state
      }
      return { result: [], totalCount: 0 };
    },

    // Contract-level NEP-17 transfers from the read-api, with decoded
    // notifications as a fallback when the dedicated table is unavailable.
    async getNep17Transfers(hash, limit = 20, skip = 0, options = {}) {
      // Prefer the transfer-only REST population: paging there keeps `skip`
      // (offset) and the count=exact total bound to the same filtered query,
      // so busy contracts don't skip/duplicate rows across pages. The
      // notifications path below interleaves event names and is kept only as
      // a fallback for when the dedicated transfer table is unavailable.
      const transferPage = await fetchContractTransfersFromIndexer(hash, "nep17", limit, skip, options);
      if (transferPage && transferPage.result.length > 0) return transferPage;
      try {
        // Fetch the page of transfers and the token's authoritative total
        // in parallel — transfer_event_count from the indexer's tokens
        // endpoint is the real "A total of N transfers" number; without
        // it the previous heuristic showed "26" for NEO (1.2M actual).
        // High-traffic contracts like GAS need >3s to assemble even a
        // small notifications page; bump the per-call timeout so the
        // request doesn't abort and leave the Transfers tab empty.
        const slowOptions = { ...options, timeoutMs: 12000 };
        const [notifications, tokenInfo] = await Promise.all([
          indexerReadService.getContractNotifications(
            hash,
            // Transfer events are interleaved with other event names. Pull a
            // generous window and filter client-side; if filtering leaves us
            // short, the next page will fetch more.
            Math.max(limit * 3, 50),
            skip,
            slowOptions,
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
      return { result: [], totalCount: 0 };
    },

    // Contract-level NEP-11 transfers from the same read-api paths.
    async getNep11Transfers(hash, limit = 20, skip = 0, options = {}) {
      // Transfer-only REST population first — same offset/total coherence
      // rationale as getNep17Transfers. Falls through to the notifications
      // path when the dedicated table yields nothing.
      const transferPage = await fetchContractTransfersFromIndexer(hash, "nep11", limit, skip, options);
      if (transferPage && transferPage.result.length > 0) return transferPage;
      try {
        // Same slow-endpoint accommodation as getNep17Transfers.
        const slowOptions = { ...options, timeoutMs: 12000 };
        const [notifications, tokenInfo] = await Promise.all([
          indexerReadService.getContractNotifications(
            hash,
            Math.max(limit * 3, 50),
            skip,
            slowOptions,
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
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn(`[tokenService] getNep11Transfers indexer fetch failed for ${hash}:`, err);
        }
        return { result: [], totalCount: 0 };
      }
    },

    async getTokenListWithFallback(type, limit = 20, skip = 0, { search = "", forceRefresh = false } = {}) {
      // Indexer first — same Mongo-to-Postgres pattern as #171/#172/#173. The
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
      } catch { /* fall through to empty state */ }

      return { result: [], totalCount: 0 };
    },

    async getByHashWithFallback(hash, options = {}) {
      // Indexer first — same Mongo-to-Postgres pattern as #171/#172/#173.
      // The enrichment block below (manifest invokefunction for missing
      // decimals/symbol) still runs against the indexer row.
      //
      // Direct-first for NEP-11 too (#24fe): GetTokenOverview now returns 200
      // for NEP-11 contracts, so the direct /tokens/{hash} endpoint resolves
      // any NEP-11 token regardless of catalog position. Passing the
      // `standard: "NEP11"` hint forces indexerReadService.getToken down the
      // catalog-only path (tokens?standard=NEP11&limit=200), which silently
      // drops any NEP-11 contract outside the first 200 rows. Strip the hint
      // so getToken tries /tokens/{hash} first; it still falls back to the
      // 200-row catalog scan internally when the direct call 404s (older
      // backend). The NEP-17 path is unaffected — it already goes direct.
      const directOptions = { ...(options || {}) };
      delete directOptions.standard;
      let item = await indexerReadService.getToken(hash, directOptions).catch(() => null);
      if (!item) {
        const chainState = await safeRpc("getcontractstate", [hash], null, options).catch(() => null);
        item = _tokenItemFromContractState(hash, chainState);
      }
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
      const key = getCacheKey("token_search", { type, name, limit, skip }, cacheOpts.network);
      return cachedRequest(
        key,
        async () => {
          const payload = await indexerReadService.getTokens(type, limit, skip, {
            search: name,
            ...cacheOpts,
          }).catch(() => null);
          const rows = Array.isArray(payload?.data) ? payload.data : [];
          return {
            result: rows.map((item) => ({
              hash: item.contract_hash,
              tokenname: item.display_name || item.contract_hash,
              symbol: item.symbol || "",
              holders: item.holder_count || 0,
              totalsupply: item.total_supply_raw || "0",
              decimals: Number(item.decimals || 0),
              type: item.standard || type,
              standard: item.standard || type,
            })),
            totalCount: Number(payload?.paging?.total || rows.length || 0),
          };
        },
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
     * contract regardless of whether neo3fura_http is in the path.
     *
     * @param {string} hash - Contract hash
     * @param {string[]} tokenIds - Array of base64-encoded token IDs
     * @param {Object} [options]
     * @returns {Promise<{result: Array<{tokenId: string, name?: string, image?: string, description?: string}>}|null>}
     */
    async getNep11Properties(hash, tokenIds, options = {}) {
      const key = getCacheKey("token_nep11_properties", { hash, tokenIds }, options.network);
      return cachedRequest(
        key,
        async () => {
          // Standard path — call properties(tokenId) on the contract for
          // each id. Most NFT detail loads pass a single id, so this is
          // typically one round-trip.
          try {
            const ids = Array.isArray(tokenIds) ? tokenIds : [tokenIds];
            const results = await Promise.all(
              ids.map((tokenId) =>
                safeRpc(
                  "invokefunction",
                  [hash, "properties", [{ type: "ByteString", value: encodeNep11TokenIdForRpc(tokenId) }]],
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
          } catch { /* fall through to null */ }
          return null;
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
