import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { safeRpc } from "./api";
import { getCurrentEnv } from "@/utils/env";
import { addressToScriptHash } from "../utils/neoHelpers";
import { NEO_HASH, GAS_HASH } from "@/constants";
import { indexerReadService } from "./indexerReadService";
import { mapAccountOverviewRowsToAccounts } from "./legacyFallbacks";

/**
 * Account Service - Neo3 账户相关 API 调用
 * @module services/accountService
 * @description 通过 neo3fura 后端获取账户数据
 */

const resolveAccountNetwork = () => {
  const env = String(getCurrentEnv() || "").toLowerCase();
  return env.includes("test") || env.includes("t5") ? "testnet" : "mainnet";
};

const buildAccountRestBasePath = (network) => `/rest/${network}`;

async function fetchJsonWithFallback(urls) {
  for (const url of urls.filter(Boolean)) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // try next fallback
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

// Per-address transfer fallback when both the legacy MongoDB-backed RPC
// (GetNep17/11TransferByAddress) and the native getnep17/11transfers RPC
// return empty for an active address. Reads from the Postgres-indexed
// nep17_transfers / nep11_transfers REST table, querying both
// from_address and to_address sides and merging by block_index DESC.
async function fetchAddressTransfersFromIndexer(network, table, address, limit, skip) {
  const safeAddr = encodeURIComponent(String(address || "").trim());
  if (!safeAddr) return null;
  // Pull a generous window (3x) so client-side merge of the from+to
  // streams still yields a full page after dedup. The two queries are
  // cheap (indexed on from_address / to_address respectively).
  const window = Math.max((Number(limit) + Number(skip)) * 2, Number(limit) * 3, 60);
  const order = "block_index.desc,execution_index.desc,notification_index.desc";
  const baseQuery = `network=eq.${network}&limit=${window}&order=${order}`;
  const basePath = `/rest/${network}/${table}`;
  try {
    const [sentRes, receivedRes] = await Promise.all([
      fetch(`${basePath}?${baseQuery}&from_address=eq.${safeAddr}`),
      fetch(`${basePath}?${baseQuery}&to_address=eq.${safeAddr}`),
    ]);
    if (!sentRes.ok && !receivedRes.ok) return null;
    const [sent, received] = await Promise.all([
      sentRes.ok ? sentRes.json() : [],
      receivedRes.ok ? receivedRes.json() : [],
    ]);
    return { sent: Array.isArray(sent) ? sent : [], received: Array.isArray(received) ? received : [] };
  } catch {
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
  {
    _getCountRpc: {
      cacheKey: "account_count",
      rpcMethod: "GetAddressCount",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({}),
    },
    _getListRpc: {
      _type: "list",
      cacheKey: "account_list",
      rpcMethod: "GetAddressList",
      errorLabel: "get account list",
      ttl: CACHE_TTL.chart,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    _getByAddressRpc: {
      cacheKey: "account_address",
      rpcMethod: "GetAddressByAddress",
      fallback: null,
      ttl: CACHE_TTL.address,
      realtime: true,
      buildParams: ([address]) => ({ Address: addressToScriptHash(address) || address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    _getAssetsRpc: {
      cacheKey: "addr_assets",
      rpcMethod: "GetAssetsHeldByAddress",
      fallback: [],
      ttl: CACHE_TTL.token,
      realtime: true,
      buildParams: ([address]) => ({ Address: addressToScriptHash(address) || address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    _getNep17TransfersRpc: {
      _type: "list",
      cacheKey: "account_nep17_transfers",
      rpcMethod: "GetNep17TransferByAddress",
      errorLabel: "get NEP17 transfers by address",
      ttl: CACHE_TTL.chart,
      buildParams: ([address, limit = 20, skip = 0]) => ({
        Address: addressToScriptHash(address) || address,
        Limit: limit,
        Skip: skip,
      }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
    _getNep11TransfersRpc: {
      _type: "list",
      cacheKey: "account_nep11_transfers",
      rpcMethod: "GetNep11TransferByAddress",
      errorLabel: "get NEP11 transfers by address",
      ttl: CACHE_TTL.chart,
      buildParams: ([address, limit = 20, skip = 0]) => ({
        Address: addressToScriptHash(address) || address,
        Limit: limit,
        Skip: skip,
      }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
  },
  {
    async getCount(options = {}) {
      const key = getCacheKey("account_count_fallback", {});
      return cachedRequest(
        key,
        async () => {
          let rpcResult = null;
          try {
            rpcResult = await this._getCountRpc(options);
          } catch (_err) {
            rpcResult = null;
          }
          const directCount = Number(rpcResult?.["total counts"] ?? rpcResult?.count ?? rpcResult ?? 0);
          if (Number.isFinite(directCount) && directCount > 0) {
            return rpcResult;
          }

          const summary = await indexerReadService.getSummary(options);
          const total = Number(summary?.total_address_count ?? 0);
          return { "total counts": Number.isFinite(total) ? total : 0 };
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
          let rpcResult = null;
          try {
            rpcResult = await this._getListRpc(limit, skip, options);
          } catch (_err) {
            rpcResult = null;
          }
          const existingRows = Array.isArray(rpcResult?.result) ? rpcResult.result : [];
          const existingCount = Number(rpcResult?.totalCount ?? 0);
          if (existingRows.length > 0 || existingCount > 0) {
            return rpcResult;
          }

          const network = resolveAccountNetwork();
          const [rows, summary] = await Promise.all([
            fetchAccountOverviewRows(network, limit, skip),
            indexerReadService.getSummary(options),
          ]);
          const balanceRows = await fetchAccountBalances(network, rows);
          return {
            result: mapAccountOverviewRowsToAccounts(rows || [], balanceRows),
            totalCount: Number(summary?.total_address_count ?? 0),
          };
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

    _paginateTransfers(transfers, limit = 20, skip = 0) {
      const safeLimit = Math.max(1, Number(limit) || 20);
      const safeSkip = Math.max(0, Number(skip) || 0);
      const sorted = [...(Array.isArray(transfers) ? transfers : [])].sort((a, b) => {
        const tsDiff = Number(b?.timestamp || 0) - Number(a?.timestamp || 0);
        if (tsDiff !== 0) return tsDiff;
        return Number(b?.blockindex || 0) - Number(a?.blockindex || 0);
      });
      return {
        result: sorted.slice(safeSkip, safeSkip + safeLimit),
        totalCount: sorted.length,
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
      // Prefer the indexer's canonical per-account record. The legacy
      // GetAssetsHeldByAddress RPC the explorer originally relied on
      // returns { result: [], totalCount: 0 } for most addresses now,
      // so without this path AddressDetail showed 0 NEO / 0 GAS / 0 tx
      // even for active accounts that the indexer fully tracks.
      try {
        const indexerAcc = await indexerReadService.getAccount(address, options);
        if (indexerAcc && (indexerAcc.tx_sent || indexerAcc.tx_signed || indexerAcc.contracts_interacted)) {
          return {
            address: indexerAcc.address || address,
            txCount: Number(indexerAcc.tx_sent || 0) + Number(indexerAcc.tx_signed || 0),
            tokenCount: undefined, // populated from assets call separately
            nep17NetRaw: indexerAcc.nep17_net_raw,
            firstTxMs: indexerAcc.first_tx_ms,
            lastTxMs: indexerAcc.last_tx_ms,
            contractsInteracted: indexerAcc.contracts_interacted,
            _source: "indexer",
          };
        }
      } catch {
        // Indexer down / metadata path unavailable — fall through to RPC.
      }

      const primary = await this._getByAddressRpc(address, options);
      // The legacy RPC returns a truthy {result:[], totalCount:0} envelope
      // even when the address has no on-chain activity according to its
      // table. Treat that as "no data" so the downstream native fallback
      // below can run; otherwise the page renders zeros for active wallets.
      if (primary && Number(primary.totalCount || 0) > 0) return primary;

      const normalizedAddress = this._normalizeAddress(address);
      if (!normalizedAddress) return primary;

      const [nep17Balances, nep11Balances, nep17Transfers, nep11Transfers] = await Promise.all([
        this._getNativeNep17Balances(normalizedAddress, options),
        this._getNativeNep11Balances(normalizedAddress, options),
        this._getNativeNep17Transfers(normalizedAddress, options),
        this._getNativeNep11Transfers(normalizedAddress, options),
      ]);

      const balances = Array.isArray(nep17Balances?.balance) ? nep17Balances.balance : [];
      const nep11Collections = Array.isArray(nep11Balances?.balance) ? nep11Balances.balance : [];

      if (balances.length === 0 && nep11Collections.length === 0) {
        return primary;
      }

      const neoBalance = balances.find((item) => this._normalizeAssetHash(item?.assethash) === NEO_HASH)?.amount || "0";
      const gasBalance = balances.find((item) => this._normalizeAssetHash(item?.assethash) === GAS_HASH)?.amount || "0";

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
    },

    async getAssets(address, options = {}) {
      const primary = await this._getAssetsRpc(address, options);
      if (Array.isArray(primary) && primary.length > 0) return primary;

      const normalizedAddress = this._normalizeAddress(address);
      if (!normalizedAddress) return Array.isArray(primary) ? primary : [];

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
      return Array.isArray(primary) ? primary : [];
    },

    async getNep17Transfers(address, limit = 20, skip = 0, options = {}) {
      const primary = await this._getNep17TransfersRpc(address, limit, skip, options);
      if (Array.isArray(primary?.result) && (primary.result.length > 0 || Number(primary.totalCount || 0) > 0)) {
        return primary;
      }

      const normalizedAddress = this._normalizeAddress(address);
      if (!normalizedAddress) return primary;

      const [nep17Transfers, nep17Balances] = await Promise.all([
        this._getNativeNep17Transfers(normalizedAddress, options),
        this._getNativeNep17Balances(normalizedAddress, options),
      ]);
      const tokenInfoMap = this._buildTokenInfoMap(nep17Balances);
      const sent = Array.isArray(nep17Transfers?.sent) ? nep17Transfers.sent : [];
      const received = Array.isArray(nep17Transfers?.received) ? nep17Transfers.received : [];

      const merged = [
        ...sent.map((item) => this._mapNativeNep17Transfer(item, "sent", normalizedAddress, tokenInfoMap)),
        ...received.map((item) => this._mapNativeNep17Transfer(item, "received", normalizedAddress, tokenInfoMap)),
      ].filter((item) => item.txid || item.hash);

      if (merged.length > 0) return this._paginateTransfers(merged, limit, skip);

      // Both legacy RPC paths empty — fall back to the Postgres-indexed
      // nep17_transfers REST table (same root cause as #150).
      const indexer = await fetchAddressTransfersFromIndexer(
        resolveAccountNetwork(),
        "nep17_transfers",
        normalizedAddress,
        limit,
        skip,
      );
      if (!indexer) return primary;
      const indexerMerged = [
        ...indexer.sent.map((row) => mapIndexerNep17TransferRow(row, "sent", tokenInfoMap)),
        ...indexer.received.map((row) => mapIndexerNep17TransferRow(row, "received", tokenInfoMap)),
      ].filter((item) => item.txid);
      if (indexerMerged.length === 0) return primary;
      return this._paginateTransfers(indexerMerged, limit, skip);
    },

    async getNep11Transfers(address, limit = 20, skip = 0, options = {}) {
      const primary = await this._getNep11TransfersRpc(address, limit, skip, options);
      if (Array.isArray(primary?.result) && (primary.result.length > 0 || Number(primary.totalCount || 0) > 0)) {
        return primary;
      }

      const normalizedAddress = this._normalizeAddress(address);
      if (!normalizedAddress) return primary;

      const nep11Transfers = await this._getNativeNep11Transfers(normalizedAddress, options);
      const sent = Array.isArray(nep11Transfers?.sent) ? nep11Transfers.sent : [];
      const received = Array.isArray(nep11Transfers?.received) ? nep11Transfers.received : [];

      const merged = [
        ...sent.map((item) => this._mapNativeNep11Transfer(item, "sent", normalizedAddress)),
        ...received.map((item) => this._mapNativeNep11Transfer(item, "received", normalizedAddress)),
      ].filter((item) => item.txid || item.hash);

      if (merged.length > 0) return this._paginateTransfers(merged, limit, skip);

      const indexer = await fetchAddressTransfersFromIndexer(
        resolveAccountNetwork(),
        "nep11_transfers",
        normalizedAddress,
        limit,
        skip,
      );
      if (!indexer) return primary;
      const indexerMerged = [
        ...indexer.sent.map((row) => mapIndexerNep11TransferRow(row, "sent")),
        ...indexer.received.map((row) => mapIndexerNep11TransferRow(row, "received")),
      ].filter((item) => item.txid);
      if (indexerMerged.length === 0) return primary;
      return this._paginateTransfers(indexerMerged, limit, skip);
    },

    /**
     * @deprecated Use getAssets instead — identical RPC call.
     */
    getTokenHoldings(address, options = {}) {
      return this.getAssets(address, options);
    },
  },
);

export default accountService;
