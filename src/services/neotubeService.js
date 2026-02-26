import axios from "axios";
import { getCurrentEnv, NET_ENV } from "../utils/env";

const DEFAULT_BASE_URL = "https://api.neotube.io/v1";
const DEFAULT_TIMEOUT_MS = 5000;

const normalizeBaseUrl = (value, fallback) => {
  const raw = String(value || fallback || "").trim();
  return raw.replace(/\/+$/, "");
};

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_NEOTUBE_API_BASE_URL, DEFAULT_BASE_URL);
const API_TIMEOUT_MS = Number(import.meta.env.VITE_NEOTUBE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

const NETWORK_BY_ENV = {
  [NET_ENV.Mainnet]: "mainnet",
  [NET_ENV.TestT5]: "testnet",
};

const ENV_ALIASES = {
  [NET_ENV.Mainnet.toLowerCase()]: NET_ENV.Mainnet,
  [NET_ENV.TestT5.toLowerCase()]: NET_ENV.TestT5,
  mainnet: NET_ENV.Mainnet,
  testnet: NET_ENV.TestT5,
  testt5: NET_ENV.TestT5,
};

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
});

const normalizeFee = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  // NeoTube returns fees in raw GAS (e.g. 0.055). We need to convert it to fixed8 fractions for the rest of the app to process correctly.
  return Math.round(num * 100000000);
};

const normalizeCount = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const resolveEnv = (env = getCurrentEnv(), { fallbackToMainnet = true } = {}) => {
  const raw = String(env || "").trim();
  if (!raw) return fallbackToMainnet ? NET_ENV.Mainnet : null;
  if (NETWORK_BY_ENV[raw]) return raw;
  const aliased = ENV_ALIASES[raw.toLowerCase()];
  if (aliased) return aliased;
  return fallbackToMainnet ? NET_ENV.Mainnet : null;
};

const toNetworkName = (env = getCurrentEnv()) => NETWORK_BY_ENV[resolveEnv(env)] || NETWORK_BY_ENV[NET_ENV.Mainnet];

const normalizePaging = (limit = 6, skip = 0) => {
  const pageSize = Math.max(1, Number(limit) || 6);
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  const offset = normalizedSkip % pageSize;
  const page = Math.floor(normalizedSkip / pageSize) + 1;
  const requestPageSize = pageSize + offset;
  return { page, pageSize, requestPageSize, offset };
};

const assertSuccess = (payload) => {
  if (!payload || payload.status !== "success") {
    const message = payload?.error_msg || "NeoTube API request failed";
    throw new Error(message);
  }
  return payload.data || {};
};

const fetchNeoTube = async (path, params, env = getCurrentEnv()) => {
  const network = toNetworkName(env);
  const response = await client.get(path, {
    params,
    headers: {
      Network: network,
    },
  });
  return assertSuccess(response.data);
};

const normalizeBlock = (block = {}) => ({
  hash: block.hash || "",
  index: normalizeCount(block.block_index ?? block.index),
  timestamp: normalizeCount(block.block_time ?? block.timestamp),
  txcount: normalizeCount(block.txs ?? block.txcount ?? block.transactioncount),
  transactioncount: normalizeCount(block.txs ?? block.txcount ?? block.transactioncount),
  size: normalizeCount(block.size),
  sysfee: normalizeFee(block.sys_fee ?? block.sysfee),
  netfee: normalizeFee(block.net_fee ?? block.netfee),
});

const normalizeTransaction = (tx = {}) => {
  const sender = tx.sender || tx.from || "";
  return {
    hash: tx.hash || tx.txid || "",
    blockindex: normalizeCount(tx.block_index ?? tx.blockindex),
    blocktime: normalizeCount(tx.block_time ?? tx.blocktime ?? tx.timestamp),
    sender,
    from: sender,
    to: tx.receiver || tx.to || "",
    size: normalizeCount(tx.size),
    nonce: tx.nonce,
    script: tx.script || "",
    validuntilblock: normalizeCount(tx.valid_until_block ?? tx.validuntilblock),
    sysfee: normalizeFee(tx.sys_fee ?? tx.sysfee),
    netfee: normalizeFee(tx.net_fee ?? tx.netfee),
    vmstate: tx.vmstate,
  };
};

export const neotubeService = {
  supportsNetwork(env = getCurrentEnv()) {
    const resolved = resolveEnv(env, { fallbackToMainnet: false });
    return Boolean(resolved && NETWORK_BY_ENV[resolved]);
  },

  async getLatestBlocks(limit = 6, skip = 0, env = getCurrentEnv()) {
    const { page, pageSize, requestPageSize, offset } = normalizePaging(limit, skip);
    const data = await fetchNeoTube("/blocks", { page, page_size: requestPageSize }, env);
    const rawRows = Array.isArray(data.blocks) ? data.blocks : [];
    const rows = rawRows.slice(offset, offset + pageSize);
    return {
      result: rows.map(normalizeBlock),
      totalCount: normalizeCount(data.total ?? rawRows.length),
    };
  },

  async getLatestTransactions(limit = 6, skip = 0, env = getCurrentEnv()) {
    const { page, pageSize, requestPageSize, offset } = normalizePaging(limit, skip);
    const data = await fetchNeoTube("/txs", { page, page_size: requestPageSize }, env);
    const rawRows = Array.isArray(data.transactions) ? data.transactions : [];
    const rows = rawRows.slice(offset, offset + pageSize);
    return {
      result: rows.map(normalizeTransaction),
      totalCount: normalizeCount(data.total ?? rawRows.length),
    };
  },

  async getStatistics(env = getCurrentEnv()) {
    const data = await fetchNeoTube("/statistics", {}, env);
    let blocks = normalizeCount(data.block_count);
    let txs = normalizeCount(data.tx_count);

    if (blocks <= 0) {
      try {
        const latestBlocks = await this.getLatestBlocks(1, 0, env);
        const totalFromList = normalizeCount(latestBlocks?.totalCount);
        if (totalFromList > 0) {
          blocks = totalFromList;
        } else {
          const latestIndex = normalizeCount(latestBlocks?.result?.[0]?.index);
          blocks = latestIndex > 0 ? latestIndex + 1 : blocks;
        }
      } catch {
        // Keep original stats value if list fallback fails.
      }
    }

    if (txs <= 0) {
      try {
        const latestTxs = await this.getLatestTransactions(1, 0, env);
        txs = normalizeCount(latestTxs?.totalCount);
      } catch {
        // Keep original stats value if list fallback fails.
      }
    }

    return {
      blocks,
      txs,
      contracts: 0,
      candidates: 0,
      addresses: normalizeCount(data.addr_count),
      tokens: normalizeCount(data.asset_count),
    };
  },
};

export default neotubeService;
