const DEFAULT_MAX_COUNTERPARTIES = 24;
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_VISITED = 80;
const DEFAULT_PER_ADDRESS_LIMIT = 30;

function cleanAddress(value) {
  return String(value || "").trim();
}

function keyAddress(value) {
  return cleanAddress(value).toLowerCase();
}

function cleanHash(value) {
  return String(value || "").trim();
}

function normalizeTimestamp(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTransfer(row = {}, fallbackStandard = "NEP17") {
  const from = cleanAddress(row.from || row.fromAddress || row.sender);
  const to = cleanAddress(row.to || row.toAddress || row.receiver);
  const txHash = cleanHash(row.txHash || row.txhash || row.txid || row.hash);
  const tokenName = String(row.tokenName || row.tokenname || row.symbol || row.name || fallbackStandard).trim();
  const tokenHash = cleanHash(row.tokenHash || row.contractHash || row.contract || row.assethash || row.asset);

  return {
    txHash,
    from,
    to,
    amount: row.amount ?? row.value ?? row.transferamount ?? "",
    tokenName: tokenName || fallbackStandard,
    tokenHash,
    tokenId: row.tokenId || row.tokenid || row.token_id || "",
    timestamp: normalizeTimestamp(row.timestamp ?? row.blocktime ?? row.time ?? row.indexed_at),
    standard: row.standard || fallbackStandard,
  };
}

function addNode(nodes, address, patch = {}) {
  const key = keyAddress(address);
  if (!key) return null;
  const existing = nodes.get(key) || {
    id: key,
    address: cleanAddress(address),
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
    txHashes: [...edge.txHashSet],
    tokenSet: undefined,
    txHashSet: undefined,
  };
}

export function buildAddressRadarGraph({
  centerAddress,
  nep17Transfers = [],
  nep11Transfers = [],
  maxCounterparties = DEFAULT_MAX_COUNTERPARTIES,
} = {}) {
  const center = cleanAddress(centerAddress);
  const centerKey = keyAddress(center);
  const nodes = new Map();
  const edges = new Map();

  if (!centerKey) {
    return {
      nodes: [],
      edges: [],
      summary: {
        inboundAccounts: 0,
        outboundAccounts: 0,
        transferCount: 0,
        hiddenCounterparties: 0,
      },
    };
  }

  addNode(nodes, center, { role: "center" });

  const normalizedTransfers = [
    ...(Array.isArray(nep17Transfers) ? nep17Transfers.map((row) => normalizeTransfer(row, "NEP17")) : []),
    ...(Array.isArray(nep11Transfers) ? nep11Transfers.map((row) => normalizeTransfer(row, "NEP11")) : []),
  ];

  let transferCount = 0;
  const inbound = new Set();
  const outbound = new Set();

  for (const transfer of normalizedTransfers) {
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

    const key = edgeKey(transfer.from, transfer.to);
    const edge = edges.get(key) || {
      id: key,
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
    if (edge.samples.length < 4) edge.samples.push(transfer);
    edges.set(key, edge);
  }

  const sortedEdges = [...edges.values()].sort((a, b) => {
    const countDiff = b.count - a.count;
    if (countDiff) return countDiff;
    const timeDiff = b.latestTimestamp - a.latestTimestamp;
    if (timeDiff) return timeDiff;
    return a.id.localeCompare(b.id);
  });
  const visibleEdges = sortedEdges.slice(0, Math.max(1, Number(maxCounterparties) || DEFAULT_MAX_COUNTERPARTIES));
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

export function buildAddressRadarPathGraph(pathResult = {}) {
  const pathNodes = Array.isArray(pathResult.nodes) ? pathResult.nodes : [];
  const pathEdges = Array.isArray(pathResult.edges) ? pathResult.edges : [];
  const nodes = new Map();
  const edges = new Map();
  const pathOrder = new Map();

  if (!pathResult.found || !pathNodes.length) {
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

  pathNodes.forEach((node, index) => {
    const address = cleanAddress(node.address);
    const key = keyAddress(address);
    if (!key) return;
    pathOrder.set(key, index);
    addNode(nodes, address, {
      role: node.role || (index === 0 ? "source" : index === pathNodes.length - 1 ? "target" : "bridge"),
    });
  });

  let transferCount = 0;
  for (const row of pathEdges) {
    const transfer = normalizeTransfer(row);
    const fromKey = keyAddress(transfer.from);
    const toKey = keyAddress(transfer.to);
    if (!fromKey || !toKey || fromKey === toKey) continue;

    transferCount += 1;
    if (!nodes.has(fromKey)) addNode(nodes, transfer.from, { role: "bridge" });
    if (!nodes.has(toKey)) addNode(nodes, transfer.to, { role: "bridge" });
    updateNodeStats(nodes, transfer.from, "out", transfer.timestamp);
    updateNodeStats(nodes, transfer.to, "in", transfer.timestamp);

    const key = edgeKey(transfer.from, transfer.to);
    const edge = edges.get(key) || {
      id: key,
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
    if (edge.samples.length < 4) edge.samples.push(transfer);
    edges.set(key, edge);
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
      transferCount,
      hiddenCounterparties: 0,
      pathDepth: Number(pathResult.depth ?? transferCount),
      visitedCount: Number(pathResult.visitedCount || nodes.size),
    },
  };
}

function normalizeFetchResult(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

function buildPathResult(sourceAddress, targetAddress, pathEdges, visitedCount) {
  const source = cleanAddress(sourceAddress);
  const target = cleanAddress(targetAddress);
  const nodeAddresses = [source];
  for (const edge of pathEdges) {
    const lastKey = keyAddress(nodeAddresses[nodeAddresses.length - 1]);
    const next = keyAddress(edge.from) === lastKey ? edge.to : edge.from;
    nodeAddresses.push(next);
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

export async function findAddressTransferPath({
  sourceAddress,
  targetAddress,
  fetchTransfers,
  maxDepth = DEFAULT_MAX_DEPTH,
  maxVisited = DEFAULT_MAX_VISITED,
  perAddressLimit = DEFAULT_PER_ADDRESS_LIMIT,
} = {}) {
  const source = cleanAddress(sourceAddress);
  const target = cleanAddress(targetAddress);
  const sourceKey = keyAddress(source);
  const targetKey = keyAddress(target);

  if (!sourceKey || !targetKey || typeof fetchTransfers !== "function") {
    return { found: false, exhausted: true, depth: 0, visitedCount: 0, nodes: [], edges: [] };
  }
  if (sourceKey === targetKey) {
    return {
      found: true,
      exhausted: false,
      depth: 0,
      visitedCount: 1,
      nodes: [{ id: sourceKey, address: source, role: "source" }],
      edges: [],
    };
  }

  const safeMaxDepth = Math.max(1, Number(maxDepth) || DEFAULT_MAX_DEPTH);
  const safeMaxVisited = Math.max(2, Number(maxVisited) || DEFAULT_MAX_VISITED);
  const safePerAddressLimit = Math.max(1, Number(perAddressLimit) || DEFAULT_PER_ADDRESS_LIMIT);
  const visited = new Set([sourceKey]);
  const queue = [{ address: source, depth: 0, pathEdges: [] }];

  while (queue.length > 0 && visited.size <= safeMaxVisited) {
    const current = queue.shift();
    if (!current || current.depth >= safeMaxDepth) continue;

    const rows = normalizeFetchResult(await fetchTransfers(current.address, {
      limit: safePerAddressLimit,
      depth: current.depth,
    }));
    const transfers = rows
      .map((row) => normalizeTransfer(row))
      .filter((transfer) => keyAddress(transfer.from) && keyAddress(transfer.to) && keyAddress(transfer.from) !== keyAddress(transfer.to))
      .slice(0, safePerAddressLimit);

    for (const transfer of transfers) {
      const fromKey = keyAddress(transfer.from);
      const toKey = keyAddress(transfer.to);
      const currentKey = keyAddress(current.address);
      if (fromKey !== currentKey && toKey !== currentKey) continue;
      const nextAddress = fromKey === currentKey ? transfer.to : transfer.from;
      const nextKey = keyAddress(nextAddress);
      if (!nextKey) continue;

      const nextPath = [...current.pathEdges, transfer];
      if (nextKey === targetKey) {
        return buildPathResult(source, target, nextPath, visited.size);
      }
      if (visited.has(nextKey) || visited.size >= safeMaxVisited) continue;

      visited.add(nextKey);
      queue.push({
        address: nextAddress,
        depth: current.depth + 1,
        pathEdges: nextPath,
      });
    }
  }

  return {
    found: false,
    exhausted: true,
    depth: 0,
    visitedCount: visited.size,
    nodes: [],
    edges: [],
  };
}
