import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { safeRpc } from "./api";
import { resolveNetworkName } from "@/utils/env";
import { addressToScriptHash } from "../utils/neoHelpers";
import { NEO_HASH, GAS_HASH } from "@/constants";
import { indexerReadService } from "./indexerReadService";
import { mapAccountOverviewRowsToAccounts } from "./mappers";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

/**
 * Account Service - Neo3 账户相关 API 调用
 * @module services/accountService
 * @description 通过 neo3fura 后端获取账户数据
 */

const resolveAccountNetwork = () => resolveNetworkName();

const buildAccountRestBasePath = (network) => `/rest/${network}`;

async function fetchJsonWithFallback(urls) {
  for (const url of urls.filter(Boolean)) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      return await res.json();
    } catch (err) {
      // Log before trying the next fallback so a broken indexer surfaces in
      // dev instead of silently masquerading as "no data".
      if (import.meta.env.DEV) {
        console.warn(`[accountService] indexer fetch failed for ${url}:`, err);
      }
    }
  }
  return null;
}

async function fetchAccountOverviewRows(network, limit, skip) {
  const select = [
    "address",
    "tx_sent",
    "tx_signed",
    "nep11_sent_events",
    "nep11_received_events",
    "last_tx_ms",
  ].join(",");
  const query = new URLSearchParams({
    select,
    network: `eq.${network}`,
    limit: String(limit),
    offset: String(skip),
    order: "nep17_net_raw.desc,last_tx_ms.desc",
  });
  const basePath = buildAccountRestBasePath(network);
  return fetchJsonWithFallback([`${basePath}/v_account_overview?${query}`]);
}

// Per-address transfer fallback for when the native getnep17/11transfers RPC
// returns empty for an active address. Reads from the Postgres-indexed
// nep17_transfers / nep11_transfers REST table, querying both from_address
// and to_address sides and merging by block_index DESC.
function parseContentRangeTotal(res) {
  // PostgREST Content-Range with Prefer: count=exact looks like
  // "items 0-19/1543"; the segment after the slash is the true total of the
  // filtered population. "*" (unknown) or a missing header yields NaN, which
  // callers treat as "no authoritative total".
  const header = res?.headers?.get?.("Content-Range") || "";
  return Number(header.split("/")[1]);
}

async function fetchAddressTransfersFromIndexer(network, table, address, limit, skip) {
  const safeAddr = encodeURIComponent(String(address || "").trim());
  if (!safeAddr) return null;
  // Fetch enough of each direction to cover the requested page after the
  // from+to streams are merged and sorted. We page from offset 0 up through
  // skip+limit (not a fixed window cap) so rows on deep pages are actually
  // reachable — the old fixed 3x window silently dropped everything past it.
  const fetchCount = Math.max(Number(limit) + Number(skip), Number(limit), 1);
  const order = "block_index.desc,execution_index.desc,notification_index.desc";
  const baseQuery = `network=eq.${network}&limit=${fetchCount}&offset=0&order=${order}`;
  const basePath = `/rest/${network}/${table}`;
  try {
    // Prefer: count=exact makes PostgREST report the true total of each
    // filtered stream in the Content-Range header, so the page count no
    // longer depends on the size of the merged window.
    const countHeaders = { Accept: "application/json", Prefer: "count=exact" };
    const [sentRes, receivedRes] = await Promise.all([
      fetchWithTimeout(`${basePath}?${baseQuery}&from_address=eq.${safeAddr}`, { headers: countHeaders }),
      fetchWithTimeout(`${basePath}?${baseQuery}&to_address=eq.${safeAddr}`, { headers: countHeaders }),
    ]);
    if (!sentRes.ok && !receivedRes.ok) return null;
    const [sent, received] = await Promise.all([
      sentRes.ok ? sentRes.json() : [],
      receivedRes.ok ? receivedRes.json() : [],
    ]);
    const sentTotal = sentRes.ok ? parseContentRangeTotal(sentRes) : NaN;
    const receivedTotal = receivedRes.ok ? parseContentRangeTotal(receivedRes) : NaN;
    // True per-address transfer total is the union of the two directions.
    // Both counters come from the same filtered queries that produced the
    // rows, so offset and total agree. NaN (header absent) drops to
    // undefined → callers fall back to the merged length.
    const totalCount = (Number.isFinite(sentTotal) || Number.isFinite(receivedTotal))
      ? (Number.isFinite(sentTotal) ? sentTotal : 0) + (Number.isFinite(receivedTotal) ? receivedTotal : 0)
      : undefined;
    return {
      sent: Array.isArray(sent) ? sent : [],
      received: Array.isArray(received) ? received : [],
      totalCount,
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[accountService] ${table} indexer fetch failed for ${address}:`, err);
    }
    return null;
  }
}

// Map a row from /rest/<network>/nep17_transfers to the legacy
// {txid, blockindex, from, to, amount, asset, ...} shape that the
// shared TransferTable component already consumes.
function mapIndexerNep17TransferRow(row, direction, tokenInfoMap = new Map()) {
  if (!row) return {};
  const contractHash = String(row.contract_hash || "").toLowerCase();
  const info = tokenInfoMap.get(contractHash) || {};
  return {
    txid: row.txid,
    txhash: row.txid,
    hash: row.txid,
    blockindex: row.block_index,
    blockIndex: row.block_index,
    timestamp: row.timestamp_ms ?? row.indexed_at,
    from: row.from_address || null,
    to: row.to_address || null,
    amount: String(row.amount_text ?? row.amount_raw ?? "0"),
    asset: row.contract_hash,
    assethash: row.contract_hash,
    contract: row.contract_hash,
    contractHash: row.contract_hash,
    tokenname: info.name || "",
    symbol: info.symbol || "",
    decimals: info.decimals,
    direction,
  };
}

function mapIndexerNep11TransferRow(row, direction) {
  if (!row) return {};
  return {
    txid: row.txid,
    txhash: row.txid,
    hash: row.txid,
    blockindex: row.block_index,
    blockIndex: row.block_index,
    timestamp: row.timestamp_ms ?? row.indexed_at,
    from: row.from_address || null,
    to: row.to_address || null,
    amount: String(row.amount_text ?? row.amount_raw ?? "1"),
    asset: row.contract_hash,
    assethash: row.contract_hash,
    contract: row.contract_hash,
    contractHash: row.contract_hash,
    tokenId: row.token_id_raw,
    direction,
  };
}

async function fetchAccountBalances(network, rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const addresses = [...new Set(safeRows.map((row) => row?.address).filter(Boolean))];
  if (!addresses.length) return [];

  const addressList = addresses.join(",");
  const contractList = [NEO_HASH, GAS_HASH].join(",");
  const query = new URLSearchParams({
    select: "address,contract_hash,balance_raw",
    network: `eq.${network}`,
    address: `in.(${addressList})`,
    contract_hash: `in.(${contractList})`,
  });
  const basePath = buildAccountRestBasePath(network);
  return (await fetchJsonWithFallback([`${basePath}/v_nep17_balances?${query}`])) || [];
}

export const accountService = createService(
  {},
  {
    async getCount(options = {}) {
      const key = getCacheKey("account_count_fallback", {});
      return cachedRequest(
        key,
        async () => {
          // Indexer summary is the authoritative address count.
          const summary = await indexerReadService.getSummary(options).catch(() => null);
          const total = Number(summary?.total_address_count ?? 0);
          if (Number.isFinite(total) && total > 0) {
            return { "total counts": total };
          }

          return { "total counts": 0 };
        },
        CACHE_TTL.stats,
        options,
      );
    },

    async getList(limit = 20, skip = 0, options = {}) {
      const key = getCacheKey("account_list_fallback", { limit, skip, env: resolveAccountNetwork() });
      return cachedRequest(
        key,
        async () => {
          // Read-api (Postgres) is the authoritative account list.
          const network = resolveAccountNetwork();
          const [rows, summary] = await Promise.all([
            fetchAccountOverviewRows(network, limit, skip).catch(() => null),
            indexerReadService.getSummary(options).catch(() => null),
          ]);
          if (Array.isArray(rows) && rows.length > 0) {
            const balanceRows = await fetchAccountBalances(network, rows);
            return {
              result: mapAccountOverviewRowsToAccounts(rows, balanceRows),
              totalCount: Number(summary?.total_address_count ?? rows.length),
            };
          }

          return { result: [], totalCount: Number(summary?.total_address_count ?? 0) };
        },
        CACHE_TTL.chart,
        options,
      );
    },

    _normalizeAddress(address) {
      return String(address || "").trim();
    },

    _toScriptHash(address) {
      const normalized = this._normalizeAddress(address);
      return addressToScriptHash(normalized) || normalized;
    },

    _normalizeAssetHash(value) {
      const raw = String(value || "")
        .trim()
        .toLowerCase();
      if (!raw) return "";
      return raw.startsWith("0x") ? raw : `0x${raw}`;
    },

    _extractTxHashesFromTransfers(payload) {
      const sent = Array.isArray(payload?.sent) ? payload.sent : [];
      const received = Array.isArray(payload?.received) ? payload.received : [];
      const hashes = new Set();

      [...sent, ...received].forEach((item) => {
        const hash = String(item?.txhash || item?.txid || item?.hash || "").trim();
        if (hash) hashes.add(hash);
      });

      return hashes;
    },

    _buildTokenInfoMap(nep17BalancesPayload) {
      const balances = Array.isArray(nep17BalancesPayload?.balance) ? nep17BalancesPayload.balance : [];
      const infoMap = new Map();

      balances.forEach((item) => {
        const hash = this._normalizeAssetHash(item?.assethash || item?.assetHash || item?.contract);
        if (!hash) return;
        infoMap.set(hash, {
          name: String(item?.name || item?.tokenname || item?.symbol || "").trim(),
          symbol: String(item?.symbol || "").trim(),
          decimals: Number(item?.decimals),
        });
      });

      return infoMap;
    },

    _mapNep17BalanceToAsset(item) {
      const hash = this._normalizeAssetHash(item?.assethash || item?.assetHash || item?.contract);
      return {
        asset: hash,
        hash,
        contract: hash,
        symbol: item?.symbol || "",
        tokenname: item?.name || item?.symbol || "",
        name: item?.name || item?.symbol || "Unknown",
        decimals: Number(item?.decimals ?? 0),
        balance: item?.amount ?? "0",
        amount: item?.amount ?? "0",
        standard: "NEP17",
      };
    },

    _mapNep11BalanceToAsset(item) {
      const hash = this._normalizeAssetHash(item?.assethash || item?.assetHash || item?.contract);
      const tokenIds = Array.isArray(item?.tokens) ? item.tokens : [];
      return {
        asset: hash,
        hash,
        contract: hash,
        symbol: item?.symbol || "",
        tokenname: item?.name || item?.symbol || "",
        name: item?.name || item?.symbol || "Unknown",
        decimals: 0,
        balance: String(tokenIds.length),
        amount: String(tokenIds.length),
        tokenIds,
        standard: "NEP11",
      };
    },

    _mapNativeNep17Transfer(item, direction, ownerAddress, tokenInfoMap) {
      const hash = this._normalizeAssetHash(item?.assethash || item?.assetHash || item?.contract);
      const info = tokenInfoMap.get(hash) || {};
      const counterparty = String(item?.transferaddress || item?.to || item?.from || "").trim();
      const txHash = String(item?.txhash || item?.txid || item?.hash || "").trim();
      const timestamp = Number(item?.timestamp || item?.blocktime || item?.time || 0);
      const from = direction === "sent" ? ownerAddress : counterparty;
      const to = direction === "sent" ? counterparty : ownerAddress;

      return {
        txid: txHash,
        txHash,
        hash: txHash,
        timestamp,
        blocktime: timestamp,
        blockindex: item?.blockindex ?? item?.blockIndex ?? null,
        from,
        to,
        sender: from,
        receiver: to,
        value: item?.amount ?? item?.value ?? "0",
        amount: item?.amount ?? item?.value ?? "0",
        contract: hash,
        assethash: hash,
        symbol: info.symbol || item?.symbol || "",
        tokenname: info.name || item?.name || item?.tokenname || item?.symbol || "",
        decimals: Number.isFinite(info.decimals) ? info.decimals : Number(item?.decimals ?? 0),
      };
    },

    _mapNativeNep11Transfer(item, direction, ownerAddress) {
      const hash = this._normalizeAssetHash(item?.assethash || item?.assetHash || item?.contract);
      const counterparty = String(item?.transferaddress || item?.to || item?.from || "").trim();
      const txHash = String(item?.txhash || item?.txid || item?.hash || "").trim();
      const timestamp = Number(item?.timestamp || item?.blocktime || item?.time || 0);
      const from = direction === "sent" ? ownerAddress : counterparty;
      const to = direction === "sent" ? counterparty : ownerAddress;

      return {
        txid: txHash,
        txHash,
        hash: txHash,
        timestamp,
        blocktime: timestamp,
        blockindex: item?.blockindex ?? item?.blockIndex ?? null,
        from,
        to,
        sender: from,
        receiver: to,
        tokenid: item?.tokenid ?? item?.tokenId ?? item?.token_id ?? "",
        tokenId: item?.tokenid ?? item?.tokenId ?? item?.token_id ?? "",
        contract: hash,
        assethash: hash,
        symbol: item?.symbol || "",
        tokenname: item?.name || item?.tokenname || item?.symbol || "",
      };
    },

    // `totalCount` is the authoritative population size (e.g. from the
    // indexer's count=exact headers). When supplied it overrides the merged
    // window length — that length only reflects the rows we fetched for this
    // page, so using it as the total produced wrong page counts and hid rows
    // past the window.
    _paginateTransfers(transfers, limit = 20, skip = 0, totalCount) {
      const safeLimit = Math.max(1, Number(limit) || 20);
      const safeSkip = Math.max(0, Number(skip) || 0);
      // Coerce timestamps numerically before comparing. Indexer rows may
      // carry epoch-ms numbers or ISO strings (indexed_at); Number("2024-…")
      // is NaN and corrupts the sort, so fall back to Date.parse for strings.
      const toEpoch = (value) => {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const sorted = [...(Array.isArray(transfers) ? transfers : [])].sort((a, b) => {
        const tsDiff = toEpoch(b?.timestamp) - toEpoch(a?.timestamp);
        if (tsDiff !== 0) return tsDiff;
        return Number(b?.blockindex || 0) - Number(a?.blockindex || 0);
      });
      return {
        result: sorted.slice(safeSkip, safeSkip + safeLimit),
        totalCount: Number.isFinite(Number(totalCount)) ? Number(totalCount) : sorted.length,
      };
    },

    async _getNativeNep17Balances(address, options = {}) {
      const normalized = this._normalizeAddress(address);
      if (!normalized) return null;
      return safeRpc("getnep17balances", [normalized], null, options);
    },

    async _getNativeNep11Balances(address, options = {}) {
      const normalized = this._normalizeAddress(address);
      if (!normalized) return null;
      return safeRpc("getnep11balances", [normalized], null, options);
    },

    async _getNativeNep17Transfers(address, options = {}) {
      const normalized = this._normalizeAddress(address);
      if (!normalized) return null;
      return safeRpc("getnep17transfers", [normalized, 0, 4102444800000], null, options);
    },

    async _getNativeNep11Transfers(address, options = {}) {
      const normalized = this._normalizeAddress(address);
      if (!normalized) return null;
      return safeRpc("getnep11transfers", [normalized, 0, 4102444800000], null, options);
    },

    async getByAddress(address, options = {}) {
      // Authoritative on-chain sources: getnep17balances/getnep11balances
      // (+ transfers for the tx count).
      const normalizedAddress = this._normalizeAddress(address);
      if (normalizedAddress) {
        const [nep17Balances, nep11Balances, nep17Transfers, nep11Transfers] = await Promise.all([
          this._getNativeNep17Balances(normalizedAddress, options),
          this._getNativeNep11Balances(normalizedAddress, options),
          this._getNativeNep17Transfers(normalizedAddress, options),
          this._getNativeNep11Transfers(normalizedAddress, options),
        ]);

        // A non-null balances response means the node answered (even when the
        // address holds nothing) — trust it. If all native calls return null,
        // the address details are unavailable.
        if (nep17Balances !== null || nep11Balances !== null) {
          const balances = Array.isArray(nep17Balances?.balance) ? nep17Balances.balance : [];
          const nep11Collections = Array.isArray(nep11Balances?.balance) ? nep11Balances.balance : [];
          const neoBalance =
            balances.find((item) => this._normalizeAssetHash(item?.assethash) === NEO_HASH)?.amount || "0";
          const gasBalance =
            balances.find((item) => this._normalizeAssetHash(item?.assethash) === GAS_HASH)?.amount || "0";
          const txHashes = new Set([
            ...this._extractTxHashesFromTransfers(nep17Transfers),
            ...this._extractTxHashesFromTransfers(nep11Transfers),
          ]);
          return {
            address: this._toScriptHash(normalizedAddress),
            neoBalance,
            gasBalance,
            txCount: txHashes.size,
            tokenCount: balances.length + nep11Collections.length,
          };
        }
      }

      return null;
    },

    async getAssets(address, options = {}) {
      // Standard `getnep17balances` / `getnep11balances` are the
      // canonical on-chain sources — work against any Neo node and
      // outlive the Mongo cleanup.
      const normalizedAddress = this._normalizeAddress(address);
      if (normalizedAddress) {
        const [nep17Balances, nep11Balances] = await Promise.all([
          this._getNativeNep17Balances(normalizedAddress, options),
          this._getNativeNep11Balances(normalizedAddress, options),
        ]);

        const nep17 = Array.isArray(nep17Balances?.balance) ? nep17Balances.balance : [];
        const nep11 = Array.isArray(nep11Balances?.balance) ? nep11Balances.balance : [];
        const assets = [
          ...nep17.map((item) => this._mapNep17BalanceToAsset(item)),
          ...nep11.map((item) => this._mapNep11BalanceToAsset(item)),
        ].filter((item) => item.asset);

        if (assets.length > 0) return assets;
      }

      return [];
    },

    async getNep17Transfers(address, limit = 20, skip = 0, options = {}) {
      // Indexer-first per #182 — same Mongo-empty pattern as the
      // NEP-11 sibling. Postgres /rest/<n>/nep17_transfers is the
      // authoritative source; native getnep17transfers is the
      // defence-in-depth chain probe.
      const normalizedAddress = this._normalizeAddress(address);
      if (normalizedAddress) {
        // Pull native balances in parallel so we have token info ready
        // for the indexer mapper (which needs symbol/decimals).
        const nep17BalancesPromise = this._getNativeNep17Balances(normalizedAddress, options);

        const indexer = await fetchAddressTransfersFromIndexer(
          resolveAccountNetwork(),
          "nep17_transfers",
          normalizedAddress,
          limit,
          skip,
        );
        if (indexer) {
          const tokenInfoMap = this._buildTokenInfoMap(await nep17BalancesPromise);
          const indexerMerged = [
            ...indexer.sent.map((row) => mapIndexerNep17TransferRow(row, "sent", tokenInfoMap)),
            ...indexer.received.map((row) => mapIndexerNep17TransferRow(row, "received", tokenInfoMap)),
          ].filter((item) => item.txid);
          if (indexerMerged.length > 0) {
            return this._paginateTransfers(indexerMerged, limit, skip, indexer.totalCount);
          }
        }

        const nep17Transfers = await this._getNativeNep17Transfers(normalizedAddress, options);
        const tokenInfoMap = this._buildTokenInfoMap(await nep17BalancesPromise);
        const sent = Array.isArray(nep17Transfers?.sent) ? nep17Transfers.sent : [];
        const received = Array.isArray(nep17Transfers?.received) ? nep17Transfers.received : [];
        const merged = [
          ...sent.map((item) => this._mapNativeNep17Transfer(item, "sent", normalizedAddress, tokenInfoMap)),
          ...received.map((item) => this._mapNativeNep17Transfer(item, "received", normalizedAddress, tokenInfoMap)),
        ].filter((item) => item.txid || item.hash);
        if (merged.length > 0) return this._paginateTransfers(merged, limit, skip);
      }

      return { result: [], totalCount: 0 };
    },

    async getNep11Transfers(address, limit = 20, skip = 0, options = {}) {
      // Indexer-first per #182. Try the Postgres-indexed nep11_transfers
      // table first, then native getnep11transfers.
      const normalizedAddress = this._normalizeAddress(address);
      if (normalizedAddress) {
        const indexer = await fetchAddressTransfersFromIndexer(
          resolveAccountNetwork(),
          "nep11_transfers",
          normalizedAddress,
          limit,
          skip,
        );
        if (indexer) {
          const indexerMerged = [
            ...indexer.sent.map((row) => mapIndexerNep11TransferRow(row, "sent")),
            ...indexer.received.map((row) => mapIndexerNep11TransferRow(row, "received")),
          ].filter((item) => item.txid);
          if (indexerMerged.length > 0) {
            return this._paginateTransfers(indexerMerged, limit, skip, indexer.totalCount);
          }
        }

        const nep11Transfers = await this._getNativeNep11Transfers(normalizedAddress, options);
        const sent = Array.isArray(nep11Transfers?.sent) ? nep11Transfers.sent : [];
        const received = Array.isArray(nep11Transfers?.received) ? nep11Transfers.received : [];
        const merged = [
          ...sent.map((item) => this._mapNativeNep11Transfer(item, "sent", normalizedAddress)),
          ...received.map((item) => this._mapNativeNep11Transfer(item, "received", normalizedAddress)),
        ].filter((item) => item.txid || item.hash);
        if (merged.length > 0) return this._paginateTransfers(merged, limit, skip);
      }

      return { result: [], totalCount: 0 };
    },
  },
);

export default accountService;
