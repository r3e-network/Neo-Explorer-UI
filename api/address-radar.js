const { runWithConcurrency } = require("./lib/concurrency");
const { sendJson } = require("./lib/http");
const { getClientIp, resolveDefaultTrustProxy } = require("./lib/simpleRateLimit");
const { createDefaultRateLimiter } = require("./lib/relayerRateLimit");
const { withApiTelemetry } = require("./lib/telemetry");

module.exports.config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const VALID_NETWORKS = new Set(["mainnet", "testnet"]);
const VALID_MODES = new Set(["direct", "path"]);
const BASE58_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{20,64}$/;
const INDEXER_REST_BASE_URL = String(
  process.env.ADDRESS_RADAR_REST_BASE_URL ||
    process.env.INDEXER_REST_BASE_URL ||
    "https://api.n3index.dev/rest/v1",
).replace(/\/+$/, "");
const INDEXER_READ_API_BASE_URL = String(
  process.env.ADDRESS_RADAR_READ_API_BASE_URL ||
    process.env.INDEXER_READ_API_BASE_URL ||
    "https://api.n3index.dev/v1",
).replace(/\/+$/, "");

const DIRECT_TRANSFER_LIMIT = 80;
const DIRECT_MAX_COUNTERPARTIES = 24;
const PATH_MAX_DEPTH = 3;
const PATH_MAX_VISITED = 36;
const PATH_MAX_FRONTIER_PER_LEVEL = 12;
const PATH_PER_ADDRESS_LIMIT = 18;
const PATH_PAIR_LIMIT = 8;
const PATH_FETCH_CONCURRENCY = 4;
const UPSTREAM_TIMEOUT_MS = 2500;
const PATH_PAIR_RETRY_TIMEOUT_MS = 2800;
const DIRECT_UPSTREAM_TIMEOUT_MS = 3200;
const DIRECT_RETRY_TIMEOUT_MS = 3200;
const SEARCH_BUDGET_MS = 7500;
const MAX_EDGE_TX_HASHES = 8;
const MAX_EDGE_SAMPLES = 4;
const RATE_LIMIT_WINDOW_MS = 60_000;

function createAddressRadarRateLimiter() {
  return createDefaultRateLimiter({
    disableEnvKey: "ADDRESS_RADAR_RATE_LIMIT_DISABLE_SHARED",
    failOpenEnvKey: "ADDRESS_RADAR_RATE_LIMIT_FAIL_OPEN",
  });
}

let addressRadarRateLimiter = createAddressRadarRateLimiter();

function positiveIntFromEnv(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function enforceAddressRadarRateLimit(req, res, mode, network) {
  const maxRequests = mode === "path"
    ? positiveIntFromEnv("ADDRESS_RADAR_PATH_RATE_LIMIT_PER_MINUTE", 24)
    : positiveIntFromEnv("ADDRESS_RADAR_DIRECT_RATE_LIMIT_PER_MINUTE", 90);
  const ip = getClientIp(req, { trustProxy: resolveDefaultTrustProxy() });
  let result;
  try {
    result = await Promise.resolve(addressRadarRateLimiter.consume({
      key: `address-radar:${network}:${mode}:${ip}`,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests,
    }));
  } catch (error) {
    sendJson(res, 503, {
      error: "Rate limiting backend temporarily unavailable. Please retry shortly.",
    }, { "Cache-Control": "no-store", "Retry-After": "2" });
    return false;
  }

  res.setHeader("X-RateLimit-Limit", String(result.limit));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.max(1, Math.ceil(result.resetAtMs / 1000))));
  if (result.allowed) return true;

  res.setHeader("Retry-After", String(result.retryAfterSeconds));
  sendJson(res, 429, {
    error: `Rate limit exceeded. Retry in ${result.retryAfterSeconds}s.`,
  }, { "Cache-Control": "no-store" });
  return false;
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanText(value) {
  return String(value || "").trim();
}

function keyAddress(value) {
  return cleanText(value).toLowerCase();
}

function normalizeNetwork(value) {
  const network = cleanText(firstQueryValue(value) || "mainnet").toLowerCase();
  if (!VALID_NETWORKS.has(network)) {
    throw new Error("network must be mainnet or testnet.");
  }
  return network;
}

function normalizeMode(value) {
  const mode = cleanText(firstQueryValue(value) || "direct").toLowerCase();
  if (!VALID_MODES.has(mode)) {
    throw new Error("mode must be direct or path.");
  }
  return mode;
}

function normalizeAddress(value, fieldName = "address") {
  const address = cleanText(firstQueryValue(value));
  if (!address || !BASE58_ADDRESS_RE.test(address)) {
    throw new Error(`${fieldName} must be a valid base58 Neo address.`);
  }
  return address;
}

function clampInt(value, { min, max, fallback }) {
  const parsed = Number(firstQueryValue(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function normalizeTimestamp(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTransfer(row = {}, standard = "NEP17") {
  return {
    txHash: cleanText(row.txHash || row.txhash || row.txid || row.hash),
    from: cleanText(row.from || row.from_address || row.sender),
    to: cleanText(row.to || row.to_address || row.receiver),
    amount: row.amount ?? row.amount_text ?? row.amount_raw ?? row.value ?? "",
    tokenName: cleanText(row.tokenName || row.tokenname || row.symbol || row.name || row.contract_hash || standard) || standard,
    tokenHash: cleanText(row.tokenHash || row.contractHash || row.contract_hash || row.contract || row.assethash || row.asset),
    tokenId: row.tokenId || row.token_id_raw || row.tokenid || row.token_id || "",
    timestamp: normalizeTimestamp(row.timestamp ?? row.timestamp_ms ?? row.blocktime ?? row.time ?? row.indexed_at),
    blockIndex: Number(row.block_index ?? row.blockIndex ?? 0) || 0,
    executionIndex: Number(row.execution_index ?? row.executionIndex ?? 0) || 0,
    notificationIndex: Number(row.notification_index ?? row.notificationIndex ?? 0) || 0,
    standard,
  };
}

function compareTransfersByRecency(a, b) {
  return (
    (b.blockIndex || 0) - (a.blockIndex || 0) ||
    (b.executionIndex || 0) - (a.executionIndex || 0) ||
    (b.notificationIndex || 0) - (a.notificationIndex || 0) ||
    (b.timestamp || 0) - (a.timestamp || 0) ||
    String(a.txHash || "").localeCompare(String(b.txHash || ""))
  );
}

async function fetchJsonWithTimeout(url, { timeoutMs = UPSTREAM_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Indexer responded ${response.status}`);
    }
    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithRetry(url, { timeoutMs = UPSTREAM_TIMEOUT_MS, retryTimeoutMs = 0 } = {}) {
  try {
    return await fetchJsonWithTimeout(url, { timeoutMs });
  } catch (error) {
    if (!retryTimeoutMs) throw error;
    return fetchJsonWithTimeout(url, { timeoutMs: retryTimeoutMs });
  }
}

function buildAddressTransferUrl(network, table, address, limit) {
  const params = new URLSearchParams({
    select: [
      "txid",
      "block_index",
      "execution_index",
      "notification_index",
      "timestamp_ms",
      "indexed_at",
      "from_address",
      "to_address",
      "contract_hash",
      "amount_text",
      "amount_raw",
      "token_id_raw",
    ].join(","),
    network: `eq.${network}`,
    order: "block_index.desc,execution_index.desc,notification_index.desc",
    limit: String(limit),
  });
  params.set("or", `(from_address.eq.${address},to_address.eq.${address})`);
  return `${INDEXER_REST_BASE_URL}/${table}?${params.toString()}`;
}

function buildReadApiAccountTransfersUrl(network, address, limit) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: "0",
  });
  return `${INDEXER_READ_API_BASE_URL}/networks/${encodeURIComponent(network)}/accounts/${encodeURIComponent(address)}/transfers?${params.toString()}`;
}

function buildAddressPairTransferUrl(network, table, fromAddress, toAddress, limit) {
  const params = new URLSearchParams({
    select: [
      "txid",
      "block_index",
      "execution_index",
      "notification_index",
      "timestamp_ms",
      "indexed_at",
      "from_address",
      "to_address",
      "contract_hash",
      "amount_text",
      "amount_raw",
      "token_id_raw",
    ].join(","),
    network: `eq.${network}`,
    from_address: `eq.${fromAddress}`,
    to_address: `eq.${toAddress}`,
    order: "block_index.desc,execution_index.desc,notification_index.desc",
    limit: String(limit),
  });
  return `${INDEXER_REST_BASE_URL}/${table}?${params.toString()}`;
}

function dedupeTransfers(transfers) {
  const seen = new Set();
  const result = [];
  for (const transfer of transfers) {
    const key = [
      transfer.txHash,
      keyAddress(transfer.from),
      keyAddress(transfer.to),
      transfer.tokenHash,
      transfer.tokenId,
      transfer.notificationIndex,
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(transfer);
  }
  return result;
}

async function fetchTransfersForAddress(network, address, limit, options = {}) {
  const safeLimit = clampInt(limit, { min: 1, max: DIRECT_TRANSFER_LIMIT, fallback: PATH_PER_ADDRESS_LIMIT });
  const timeoutMs = Number(options.timeoutMs || UPSTREAM_TIMEOUT_MS);
  const retryTimeoutMs = Number(options.retryTimeoutMs || 0);
  const warnings = [];

  try {
    const readApiRows = await fetchJsonWithRetry(buildReadApiAccountTransfersUrl(network, address, safeLimit), {
      timeoutMs,
      retryTimeoutMs,
    });
    const readApiTransfers = readApiRows.map((row) => normalizeTransfer(row, row.standard || "NEP17"));
    if (readApiTransfers.length > 0) {
      return {
        transfers: dedupeTransfers(readApiTransfers)
          .filter((transfer) => keyAddress(transfer.from) && keyAddress(transfer.to) && keyAddress(transfer.from) !== keyAddress(transfer.to))
          .sort(compareTransfersByRecency)
          .slice(0, safeLimit),
        warnings,
      };
    }
  } catch (error) {
    warnings.push(`read-api: ${error?.message || "unavailable"}`);
  }

  const tables = [
    { name: "nep17_transfers", standard: "NEP17" },
    { name: "nep11_transfers", standard: "NEP11" },
  ];
  const settled = await Promise.allSettled(
    tables.map(async (table) => {
      const url = buildAddressTransferUrl(network, table.name, address, safeLimit);
      const rows = await fetchJsonWithRetry(url, { timeoutMs, retryTimeoutMs });
      return rows.map((row) => normalizeTransfer(row, table.standard));
    }),
  );

  const transfers = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      transfers.push(...result.value);
    } else {
      warnings.push(`${tables[index].name}: ${result.reason?.message || "unavailable"}`);
    }
  });

  if (transfers.length === 0 && warnings.length > 0) {
    const error = new Error("Radar transfer sources are partially unavailable.");
    error.statusCode = 502;
    error.warnings = warnings;
    throw error;
  }

  return {
    transfers: dedupeTransfers(transfers)
      .filter((transfer) => keyAddress(transfer.from) && keyAddress(transfer.to) && keyAddress(transfer.from) !== keyAddress(transfer.to))
      .sort(compareTransfersByRecency)
      .slice(0, safeLimit),
    warnings,
  };
}

async function fetchTransfersBetweenAddresses(network, leftAddress, rightAddress, limit, options = {}) {
  const safeLimit = clampInt(limit, { min: 1, max: PATH_PAIR_LIMIT, fallback: PATH_PAIR_LIMIT });
  const timeoutMs = Number(options.timeoutMs || UPSTREAM_TIMEOUT_MS);
  const retryTimeoutMs = Number(options.retryTimeoutMs || 0);
  const leftKey = keyAddress(leftAddress);
  const rightKey = keyAddress(rightAddress);
  const tables = [
    { name: "nep17_transfers", standard: "NEP17" },
    { name: "nep11_transfers", standard: "NEP11" },
  ];
  const directions = [
    [leftAddress, rightAddress],
    [rightAddress, leftAddress],
  ];
  const jobs = [];
  for (const table of tables) {
    for (const [fromAddress, toAddress] of directions) {
      jobs.push({ table, fromAddress, toAddress });
    }
  }

  const settled = await Promise.allSettled(
    jobs.map(async ({ table, fromAddress, toAddress }) => {
      const url = buildAddressPairTransferUrl(network, table.name, fromAddress, toAddress, safeLimit);
      const rows = await fetchJsonWithRetry(url, { timeoutMs, retryTimeoutMs });
      return rows.map((row) => normalizeTransfer(row, table.standard));
    }),
  );

  const transfers = [];
  const warnings = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      transfers.push(...result.value);
    } else {
      const job = jobs[index];
      warnings.push(`${job.table.name}:${job.fromAddress}->${job.toAddress}: ${result.reason?.message || "unavailable"}`);
    }
  });

  const filtered = dedupeTransfers(transfers)
    .filter((transfer) => {
      const fromKey = keyAddress(transfer.from);
      const toKey = keyAddress(transfer.to);
      return (
        (fromKey === leftKey && toKey === rightKey) ||
        (fromKey === rightKey && toKey === leftKey)
      );
    })
    .sort(compareTransfersByRecency)
    .slice(0, safeLimit);

  if (filtered.length === 0 && warnings.length > 0) {
    const error = new Error("Radar pair transfer sources are partially unavailable.");
    error.statusCode = 502;
    error.warnings = warnings;
    throw error;
  }

  return { transfers: filtered, warnings };
}

function addNode(nodes, address, patch = {}) {
  const key = keyAddress(address);
  if (!key) return null;
  const existing = nodes.get(key) || {
    id: key,
    address: cleanText(address),
    role: "counterparty",
    inCount: 0,
    outCount: 0,
    transferCount: 0,
    latestTimestamp: 0,
  };
  const next = { ...existing, ...patch };
  nodes.set(key, next);
  return next;
}

function mergeRole(currentRole, nextRole) {
  if (!currentRole || currentRole === "counterparty") return nextRole;
  if (currentRole === nextRole) return currentRole;
  if (currentRole === "center") return "center";
  return "bridge";
}

function edgeKey(from, to) {
  return `${keyAddress(from)}->${keyAddress(to)}`;
}

function updateNodeStats(nodes, address, direction, timestamp) {
  const node = addNode(nodes, address);
  if (!node) return;
  if (direction === "in") node.inCount += 1;
  if (direction === "out") node.outCount += 1;
  node.transferCount += 1;
  node.latestTimestamp = Math.max(node.latestTimestamp || 0, timestamp || 0);
}

function finalizeEdge(edge) {
  return {
    ...edge,
    tokens: [...edge.tokenSet].sort(),
    txHashes: [...edge.txHashSet].slice(0, MAX_EDGE_TX_HASHES),
    tokenSet: undefined,
    txHashSet: undefined,
  };
}

function buildDirectGraph(centerAddress, transfers, maxCounterparties = DIRECT_MAX_COUNTERPARTIES) {
  const center = cleanText(centerAddress);
  const centerKey = keyAddress(center);
  const nodes = new Map();
  const edges = new Map();
  const inbound = new Set();
  const outbound = new Set();
  let transferCount = 0;

  addNode(nodes, center, { role: "center" });

  for (const transfer of Array.isArray(transfers) ? transfers : []) {
    const fromKey = keyAddress(transfer.from);
    const toKey = keyAddress(transfer.to);
    if (!fromKey || !toKey || fromKey === toKey) continue;
    const isInbound = toKey === centerKey;
    const isOutbound = fromKey === centerKey;
    if (!isInbound && !isOutbound) continue;

    transferCount += 1;
    const counterparty = isInbound ? transfer.from : transfer.to;
    const counterpartyKey = keyAddress(counterparty);
    if (!counterpartyKey) continue;
    if (isInbound) inbound.add(counterpartyKey);
    if (isOutbound) outbound.add(counterpartyKey);

    const counterpartyNode = addNode(nodes, counterparty);
    counterpartyNode.role = mergeRole(counterpartyNode.role, isInbound ? "source" : "sink");
    updateNodeStats(nodes, transfer.from, "out", transfer.timestamp);
    updateNodeStats(nodes, transfer.to, "in", transfer.timestamp);

    const id = edgeKey(transfer.from, transfer.to);
    const edge = edges.get(id) || {
      id,
      from: transfer.from,
      to: transfer.to,
      count: 0,
      tokenSet: new Set(),
      txHashSet: new Set(),
      latestTimestamp: 0,
      samples: [],
    };
    edge.count += 1;
    if (transfer.tokenName) edge.tokenSet.add(transfer.tokenName);
    if (transfer.txHash) edge.txHashSet.add(transfer.txHash);
    edge.latestTimestamp = Math.max(edge.latestTimestamp, transfer.timestamp);
    if (edge.samples.length < MAX_EDGE_SAMPLES) edge.samples.push(transfer);
    edges.set(id, edge);
  }

  const sortedEdges = [...edges.values()].sort((a, b) => {
    const countDiff = b.count - a.count;
    if (countDiff) return countDiff;
    const timeDiff = b.latestTimestamp - a.latestTimestamp;
    if (timeDiff) return timeDiff;
    return a.id.localeCompare(b.id);
  });
  const visibleEdges = sortedEdges.slice(0, maxCounterparties);
  const visibleAddressKeys = new Set([centerKey]);
  for (const edge of visibleEdges) {
    visibleAddressKeys.add(keyAddress(edge.from));
    visibleAddressKeys.add(keyAddress(edge.to));
  }

  return {
    nodes: [...nodes.values()]
      .filter((node) => visibleAddressKeys.has(node.id))
      .sort((a, b) => {
        if (a.role === "center") return -1;
        if (b.role === "center") return 1;
        return b.transferCount - a.transferCount || a.address.localeCompare(b.address);
      }),
    edges: visibleEdges.map(finalizeEdge),
    summary: {
      inboundAccounts: inbound.size,
      outboundAccounts: outbound.size,
      transferCount,
      hiddenCounterparties: Math.max(0, sortedEdges.length - visibleEdges.length),
    },
  };
}

function buildPathResult(sourceAddress, targetAddress, pathEdges, visitedCount) {
  const source = cleanText(sourceAddress);
  const target = cleanText(targetAddress);
  const nodeAddresses = [source];
  for (const edge of pathEdges) {
    const lastKey = keyAddress(nodeAddresses[nodeAddresses.length - 1]);
    nodeAddresses.push(keyAddress(edge.from) === lastKey ? edge.to : edge.from);
  }
  if (keyAddress(nodeAddresses[nodeAddresses.length - 1]) !== keyAddress(target)) {
    nodeAddresses.push(target);
  }

  return {
    found: true,
    exhausted: false,
    depth: pathEdges.length,
    visitedCount,
    nodes: nodeAddresses.map((address, index) => ({
      id: keyAddress(address),
      address,
      role: index === 0 ? "source" : index === nodeAddresses.length - 1 ? "target" : "bridge",
    })),
    edges: pathEdges,
  };
}

function buildPathGraph(pathResult = {}) {
  if (!pathResult.found) {
    return {
      nodes: [],
      edges: [],
      summary: {
        inboundAccounts: 0,
        outboundAccounts: 0,
        transferCount: 0,
        hiddenCounterparties: 0,
        pathDepth: 0,
        visitedCount: Number(pathResult.visitedCount || 0),
      },
    };
  }
  const nodes = new Map();
  const edges = new Map();
  const pathOrder = new Map();
  pathResult.nodes.forEach((node, index) => {
    pathOrder.set(node.id, index);
    addNode(nodes, node.address, { role: node.role });
  });

  for (const transfer of pathResult.edges) {
    updateNodeStats(nodes, transfer.from, "out", transfer.timestamp);
    updateNodeStats(nodes, transfer.to, "in", transfer.timestamp);
    const id = edgeKey(transfer.from, transfer.to);
    const edge = edges.get(id) || {
      id,
      from: transfer.from,
      to: transfer.to,
      count: 0,
      tokenSet: new Set(),
      txHashSet: new Set(),
      latestTimestamp: 0,
      samples: [],
    };
    edge.count += 1;
    if (transfer.tokenName) edge.tokenSet.add(transfer.tokenName);
    if (transfer.txHash) edge.txHashSet.add(transfer.txHash);
    edge.latestTimestamp = Math.max(edge.latestTimestamp, transfer.timestamp);
    if (edge.samples.length < MAX_EDGE_SAMPLES) edge.samples.push(transfer);
    edges.set(id, edge);
  }

  return {
    nodes: [...nodes.values()].sort((a, b) => {
      const aOrder = pathOrder.has(a.id) ? pathOrder.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bOrder = pathOrder.has(b.id) ? pathOrder.get(b.id) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.address.localeCompare(b.address);
    }),
    edges: [...edges.values()].map(finalizeEdge),
    summary: {
      inboundAccounts: 0,
      outboundAccounts: 0,
      transferCount: pathResult.edges.length,
      hiddenCounterparties: 0,
      pathDepth: Number(pathResult.depth || pathResult.edges.length),
      visitedCount: Number(pathResult.visitedCount || nodes.size),
    },
  };
}

async function findPath({ network, sourceAddress, targetAddress, maxDepth, maxVisited, perAddressLimit }) {
  const sourceKey = keyAddress(sourceAddress);
  const targetKey = keyAddress(targetAddress);
  if (sourceKey === targetKey) {
    return {
      found: true,
      exhausted: false,
      depth: 0,
      visitedCount: 1,
      nodes: [{ id: sourceKey, address: sourceAddress, role: "source" }],
      edges: [],
    };
  }

  const startedAt = Date.now();
  const visited = new Set([sourceKey]);
  let frontier = [{ address: sourceAddress, depth: 0, pathEdges: [] }];
  let exhausted = false;

  const directPayload = await fetchTransfersBetweenAddresses(network, sourceAddress, targetAddress, PATH_PAIR_LIMIT, {
    timeoutMs: UPSTREAM_TIMEOUT_MS,
    retryTimeoutMs: PATH_PAIR_RETRY_TIMEOUT_MS,
  });
  if (directPayload.transfers.length > 0) {
    return buildPathResult(sourceAddress, targetAddress, [directPayload.transfers[0]], visited.size);
  }

  while (frontier.length > 0 && visited.size < maxVisited) {
    if (Date.now() - startedAt > SEARCH_BUDGET_MS) {
      exhausted = true;
      break;
    }

    const batch = frontier.splice(0, PATH_MAX_FRONTIER_PER_LEVEL);
    const results = await runWithConcurrency(
      batch,
      async (current) => {
        if (current.depth >= maxDepth) return { current, transfers: [] };
        const targetPayload = current.depth > 0
          ? await fetchTransfersBetweenAddresses(network, current.address, targetAddress, PATH_PAIR_LIMIT, {
              timeoutMs: UPSTREAM_TIMEOUT_MS,
              retryTimeoutMs: PATH_PAIR_RETRY_TIMEOUT_MS,
            })
          : { transfers: [] };
        const payload = await fetchTransfersForAddress(network, current.address, perAddressLimit, {
          timeoutMs: UPSTREAM_TIMEOUT_MS,
        });
        return { current, transfers: dedupeTransfers([...targetPayload.transfers, ...payload.transfers]) };
      },
      PATH_FETCH_CONCURRENCY,
    );

    const nextFrontier = [];
    for (const result of results) {
      if (!result || result.__error || !result.current) {
        exhausted = true;
        continue;
      }
      const { current, transfers } = result;
      const currentKey = keyAddress(current.address);
      for (const transfer of transfers) {
        const fromKey = keyAddress(transfer.from);
        const toKey = keyAddress(transfer.to);
        if (fromKey !== currentKey && toKey !== currentKey) continue;
        const nextAddress = fromKey === currentKey ? transfer.to : transfer.from;
        const nextKey = keyAddress(nextAddress);
        if (!nextKey) continue;

        const nextPath = [...current.pathEdges, transfer];
        if (nextKey === targetKey) {
          return buildPathResult(sourceAddress, targetAddress, nextPath, visited.size);
        }
        if (visited.has(nextKey) || current.depth + 1 >= maxDepth || visited.size >= maxVisited) {
          continue;
        }

        visited.add(nextKey);
        nextFrontier.push({
          address: nextAddress,
          depth: current.depth + 1,
          pathEdges: nextPath,
        });
      }
    }

    frontier = nextFrontier;
    if (frontier.length === 0 && batch.length === 0) break;
  }

  return {
    found: false,
    exhausted: exhausted || frontier.length > 0 || visited.size >= maxVisited,
    depth: 0,
    visitedCount: visited.size,
    nodes: [],
    edges: [],
  };
}

function cacheHeaders(mode) {
  return {
    "Cache-Control": mode === "path"
      ? "public, max-age=15, s-maxage=60, stale-while-revalidate=120"
      : "public, max-age=10, s-maxage=30, stale-while-revalidate=120",
    "Access-Control-Allow-Origin": "*",
  };
}

async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let network;
  let mode;
  let address;
  let source;
  let target;
  let limit;
  let maxDepth;
  let perAddressLimit;

  try {
    network = normalizeNetwork(req.query?.network);
    mode = normalizeMode(req.query?.mode);
    limit = clampInt(req.query?.limit, { min: 1, max: DIRECT_TRANSFER_LIMIT, fallback: DIRECT_TRANSFER_LIMIT });
    maxDepth = clampInt(req.query?.depth, { min: 1, max: PATH_MAX_DEPTH, fallback: PATH_MAX_DEPTH });
    perAddressLimit = clampInt(req.query?.perAddressLimit, {
      min: 1,
      max: PATH_PER_ADDRESS_LIMIT,
      fallback: PATH_PER_ADDRESS_LIMIT,
    });
    if (mode === "direct") {
      address = normalizeAddress(req.query?.address, "address");
    } else {
      source = normalizeAddress(req.query?.source || req.query?.address, "source");
      target = normalizeAddress(req.query?.target, "target");
    }
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Invalid address radar request." }, cacheHeaders("direct"));
  }

  if (!(await enforceAddressRadarRateLimit(req, res, mode, network))) {
    return undefined;
  }

  try {
    if (mode === "direct") {
      const payload = await fetchTransfersForAddress(network, address, limit, {
        timeoutMs: DIRECT_UPSTREAM_TIMEOUT_MS,
        retryTimeoutMs: DIRECT_RETRY_TIMEOUT_MS,
      });
      const graph = buildDirectGraph(address, payload.transfers, DIRECT_MAX_COUNTERPARTIES);
      return sendJson(res, 200, {
        data: {
          mode,
          network,
          address,
          graph,
          warnings: payload.warnings,
          limits: {
            transferLimit: limit,
            maxCounterparties: DIRECT_MAX_COUNTERPARTIES,
          },
        },
      }, cacheHeaders(mode));
    }

    const result = await findPath({
      network,
      sourceAddress: source,
      targetAddress: target,
      maxDepth,
      maxVisited: PATH_MAX_VISITED,
      perAddressLimit,
    });
    const graph = buildPathGraph(result);
    return sendJson(res, 200, {
      data: {
        mode,
        network,
        source,
        target,
        result,
        graph,
        limits: {
          maxDepth,
          maxVisited: PATH_MAX_VISITED,
          perAddressLimit,
          concurrency: PATH_FETCH_CONCURRENCY,
        },
      },
    }, cacheHeaders(mode));
  } catch (error) {
    const statusCode = error?.statusCode || 502;
    return sendJson(res, statusCode, {
      error: statusCode >= 500 ? "Address radar data is unavailable." : error.message,
      details: process.env.NODE_ENV === "production" ? undefined : error?.message,
    }, { ...cacheHeaders(mode), "Cache-Control": "no-store" });
  }
}

handler._internal = {
  buildDirectGraph,
  buildPathGraph,
  findPath,
  normalizeAddress,
  normalizeNetwork,
  resetRateLimiterForTests() {
    addressRadarRateLimiter = createAddressRadarRateLimiter();
  },
  setRateLimiterForTests(limiter) {
    addressRadarRateLimiter = limiter;
  },
};

module.exports = withApiTelemetry("address-radar", handler);
