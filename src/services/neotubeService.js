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

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
});

const normalizeFee = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeCount = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toNetworkName = (env = getCurrentEnv()) => NETWORK_BY_ENV[env] || NETWORK_BY_ENV[NET_ENV.Mainnet];

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
    return Boolean(NETWORK_BY_ENV[env]);
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
    return {
      blocks: normalizeCount(data.block_count),
      txs: normalizeCount(data.tx_count),
      contracts: 0,
      candidates: 0,
      addresses: normalizeCount(data.addr_count),
      tokens: normalizeCount(data.asset_count),
    };
  },
};

export default neotubeService;
