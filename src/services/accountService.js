import { CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { safeRpc } from "./api";
import { addressToScriptHash } from "../utils/neoHelpers";

/**
 * Account Service - Neo3 账户相关 API 调用
 * @module services/accountService
 * @description 通过 neo3fura 后端获取账户数据
 */

export const accountService = createService(
  {
    getCount: {
      cacheKey: "account_count",
      rpcMethod: "GetAddressCount",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({}),
    },
    getList: {
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
        Skip: skip 
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
        Skip: skip 
      }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
  },
  {
    _normalizeAddress(address) {
      return String(address || "").trim();
    },

    _toScriptHash(address) {
      const normalized = this._normalizeAddress(address);
      return addressToScriptHash(normalized) || normalized;
    },

    _normalizeAssetHash(value) {
      const raw = String(value || "").trim().toLowerCase();
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
      const balances = Array.isArray(nep17BalancesPayload?.balance)
        ? nep17BalancesPayload.balance
        : [];
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
      const primary = await this._getByAddressRpc(address, options);
      if (primary) return primary;

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

      const neoHash = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
      const gasHash = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
      const neoBalance = balances.find((item) => this._normalizeAssetHash(item?.assethash) === neoHash)?.amount || "0";
      const gasBalance = balances.find((item) => this._normalizeAssetHash(item?.assethash) === gasHash)?.amount || "0";

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

      if (merged.length === 0) return primary;
      return this._paginateTransfers(merged, limit, skip);
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

      if (merged.length === 0) return primary;
      return this._paginateTransfers(merged, limit, skip);
    },

    /**
     * @deprecated Use getAssets instead — identical RPC call.
     */
    getTokenHoldings(address, options = {}) {
      return this.getAssets(address, options);
    },
  }
);

export default accountService;
