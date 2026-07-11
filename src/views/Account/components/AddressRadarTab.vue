<template>
  <section class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="item in summaryItems" :key="item.key" class="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-low">{{ item.label }}</div>
        <div class="mt-1 text-2xl font-semibold text-high">{{ item.value }}</div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition"
          :class="mode === 'direct' ? 'bg-[var(--bg-tertiary)] text-high shadow-sm' : 'text-mid hover:text-high'"
          data-testid="radar-mode-direct"
          @click="mode = 'direct'"
        >
          {{ t("addressDetail.radarModeCounterparties") }}
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition"
          :class="mode === 'path' ? 'bg-[var(--bg-tertiary)] text-high shadow-sm' : 'text-mid hover:text-high'"
          data-testid="radar-mode-path"
          @click="mode = 'path'"
        >
          {{ t("addressDetail.radarModePath") }}
        </button>
      </div>

      <button
        v-if="error"
        type="button"
        class="inline-flex items-center rounded-lg border border-[var(--border-primary)] px-3 py-2 text-sm font-medium text-high hover:bg-[var(--bg-secondary)]"
        @click="$emit('retry')"
      >
        {{ t("addressDetail.radarRetry") }}
      </button>
    </div>

    <form
      v-if="mode === 'path'"
      class="grid gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_auto]"
      data-testid="radar-path-form"
      @submit.prevent="searchPath"
    >
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase tracking-wide text-low">{{ t("addressDetail.radarSourceAddress") }}</span>
        <input
          v-model.trim="pathSource"
          type="text"
          class="input-field w-full"
          autocomplete="off"
          :placeholder="t('addressDetail.radarSourceAddress')"
          data-testid="radar-source-input"
        />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase tracking-wide text-low">{{ t("addressDetail.radarTargetAddress") }}</span>
        <input
          v-model.trim="pathTarget"
          type="text"
          class="input-field w-full"
          autocomplete="off"
          :placeholder="t('addressDetail.radarTargetAddress')"
          data-testid="radar-target-input"
        />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase tracking-wide text-low">{{ t("addressDetail.radarDepth") }}</span>
        <select v-model.number="pathDepth" class="input-field w-full">
          <option v-for="value in depthOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
      <div class="flex items-end">
        <button
          type="submit"
          class="btn-primary h-10 w-full justify-center px-4 md:w-auto"
          :disabled="pathSearching"
        >
          {{ pathSearching ? t("addressDetail.radarSearching") : t("addressDetail.radarSearch") }}
        </button>
      </div>
    </form>

    <div
      v-if="pathStatus"
      class="rounded-lg border px-3 py-2 text-sm"
      :class="pathStatus === 'found' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'"
      data-testid="asset-radar-path-status"
    >
      {{ pathStatus === "found" ? t("addressDetail.radarPathFound", { count: pathResult?.depth || 0 }) : t("addressDetail.radarPathNotFound") }}
    </div>

    <div v-if="pathError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {{ pathError }}
    </div>

    <div v-if="loading" class="space-y-2">
      <Skeleton v-for="index in 5" :key="index" height="52px" />
    </div>

    <ErrorState v-else-if="error" :title="t('addressDetail.radarLoadError')" :message="error" @retry="$emit('retry')" />

    <EmptyState
      v-else-if="!hasGraph"
      :message="t('addressDetail.radarNoTransfersTitle')"
      :description="t('addressDetail.radarNoTransfersDesc')"
    />

    <div v-else class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div class="overflow-x-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <svg
          class="min-w-[720px]"
          :viewBox="`0 0 ${viewBox.width} ${viewBox.height}`"
          role="img"
          :aria-label="t('addressDetail.radarGraphAria')"
          data-testid="asset-radar-graph"
        >
          <defs>
            <marker id="radar-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" />
            </marker>
          </defs>

          <g>
            <g v-for="edge in layoutEdges" :key="edge.id">
              <title>{{ shortAddress(edge.from) }} -> {{ shortAddress(edge.to) }}: {{ formatTokens(edge.tokens) }}</title>
              <path
                :d="edge.path"
                fill="none"
                :stroke="edge.color"
                :stroke-width="edge.width"
                stroke-linecap="round"
                stroke-opacity="0.82"
                marker-end="url(#radar-arrow)"
              />
              <text
                v-if="showEdgeLabels"
                :x="edge.labelX"
                :y="edge.labelY"
                text-anchor="middle"
                class="fill-[var(--text-secondary)] text-[11px] font-medium"
              >
                {{ edge.label }}
              </text>
            </g>
          </g>

          <g>
            <g
              v-for="node in layoutNodes"
              :key="node.id"
              role="button"
              tabindex="0"
              class="cursor-pointer outline-none"
              data-testid="asset-radar-node"
              @click="selectedNodeId = node.id"
              @keydown.enter.prevent="selectedNodeId = node.id"
              @keydown.space.prevent="selectedNodeId = node.id"
            >
              <title>{{ node.address }} - {{ node.roleLabel }}</title>
              <circle
                :cx="node.x"
                :cy="node.y"
                :r="node.radius"
                :fill="node.fill"
                :stroke="selectedNodeId === node.id ? '#f8fafc' : node.stroke"
                :stroke-width="selectedNodeId === node.id ? 3 : 2"
                filter="drop-shadow(0 10px 18px rgba(0,0,0,0.22))"
              />
              <text
                :x="node.x"
                :y="node.y + 4"
                text-anchor="middle"
                class="pointer-events-none fill-white text-[12px] font-bold"
              >
                {{ node.initial }}
              </text>
              <text
                v-if="showNodeLabels"
                :x="node.x"
                :y="node.y + node.radius + 17"
                text-anchor="middle"
                class="pointer-events-none fill-[var(--text-primary)] text-[11px] font-semibold"
              >
                {{ node.label }}
              </text>
              <text
                v-if="showNodeLabels"
                :x="node.x"
                :y="node.y + node.radius + 31"
                text-anchor="middle"
                class="pointer-events-none fill-[var(--text-tertiary)] text-[10px]"
              >
                {{ node.roleLabel }}
              </text>
            </g>
          </g>
        </svg>

        <div class="border-t border-[var(--border-primary)] p-3">
          <div class="grid gap-2 sm:grid-cols-2">
            <div v-for="edge in visibleEdges" :key="edge.id" class="rounded-md bg-[var(--bg-primary)] px-3 py-2 text-xs text-mid">
              <div class="font-medium text-high">{{ shortAddress(edge.from) }} -> {{ shortAddress(edge.to) }}</div>
              <div>{{ formatTokens(edge.tokens) }} &middot; {{ t("addressDetail.radarEdgeCount", { count: edge.count }) }}</div>
              <div v-if="edge.txHashes?.length" class="mt-1 font-mono text-[11px] text-low">
                {{ edge.txHashes.slice(0, 2).join(", ") }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
        <div v-if="selectedNode" class="space-y-3">
          <div>
            <div class="text-xs font-semibold uppercase tracking-wide text-low">{{ nodeRoleLabel(selectedNode.role) }}</div>
            <HashLink :hash="selectedNode.address" type="address" :copyable="true" />
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-low">{{ t("addressDetail.radarInbound") }}</dt>
              <dd class="font-semibold text-high">{{ selectedNode.inCount || 0 }}</dd>
            </div>
            <div>
              <dt class="text-low">{{ t("addressDetail.radarOutbound") }}</dt>
              <dd class="font-semibold text-high">{{ selectedNode.outCount || 0 }}</dd>
            </div>
            <div>
              <dt class="text-low">{{ t("addressDetail.radarSummaryTransfers") }}</dt>
              <dd class="font-semibold text-high">{{ selectedNode.transferCount || 0 }}</dd>
            </div>
            <div>
              <dt class="text-low">{{ t("addressDetail.radarSummaryHidden") }}</dt>
              <dd class="font-semibold text-high">{{ activeGraph.summary.hiddenCounterparties || 0 }}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  buildAddressRadarGraph,
  buildAddressRadarPathGraph,
  findAddressTransferPath,
} from "@/utils/addressRadar";
import { isAbortError } from "@/utils/abortError";
import Skeleton from "@/components/common/Skeleton.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import HashLink from "@/components/common/HashLink.vue";

const props = defineProps({
  address: { type: String, default: "" },
  graph: { type: Object, default: null },
  limits: { type: Object, default: null },
  nep17Transfers: { type: Array, default: () => [] },
  nep11Transfers: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  fetchPath: { type: Function, default: null },
  fetchTransfers: { type: Function, default: null },
});

defineEmits(["retry"]);

const { t } = useI18n();
const viewBox = { width: 920, height: 430 };
const depthOptions = [1, 2, 3];
const mode = ref("direct");
const selectedNodeId = ref("");
const pathSource = ref(props.address);
const pathTarget = ref("");
const pathDepth = ref(3);
const pathSearching = ref(false);
const pathError = ref("");
const pathStatus = ref("");
const pathResult = ref(null);
const pathGraph = ref(null);
let pathSearchSeq = 0;
let pathAbortController = null;

const directGraph = computed(() => {
  const serverGraph = normalizeGraphPayload(props.graph);
  if (serverGraph) return serverGraph;
  return buildAddressRadarGraph({
    centerAddress: props.address,
    nep17Transfers: props.nep17Transfers,
    nep11Transfers: props.nep11Transfers,
    maxCounterparties: Number(props.limits?.maxCounterparties || 24),
  });
});

const activeGraph = computed(() => {
  if (mode.value === "path" && pathGraph.value) return pathGraph.value;
  return directGraph.value;
});

const hasGraph = computed(() => {
  const graph = activeGraph.value;
  return graph.nodes.length > 0 && (graph.edges.length > 0 || pathResult.value?.found);
});

const summaryItems = computed(() => [
  {
    key: "inbound",
    label: t("addressDetail.radarSummaryInbound"),
    value: directGraph.value.summary.inboundAccounts,
  },
  {
    key: "outbound",
    label: t("addressDetail.radarSummaryOutbound"),
    value: directGraph.value.summary.outboundAccounts,
  },
  {
    key: "transfers",
    label: t("addressDetail.radarSummaryTransfers"),
    value: directGraph.value.summary.transferCount,
  },
  {
    key: "hidden",
    label: t("addressDetail.radarSummaryHidden"),
    value: directGraph.value.summary.hiddenCounterparties,
  },
]);

const layoutNodes = computed(() => layoutGraph(activeGraph.value, mode.value));
const showNodeLabels = computed(() => layoutNodes.value.length <= 14);
const showEdgeLabels = computed(() => activeGraph.value.edges.length <= 10);

const layoutEdges = computed(() => {
  const nodeById = new Map(layoutNodes.value.map((node) => [node.id, node]));
  return activeGraph.value.edges
    .map((edge) => {
      const from = nodeById.get(keyAddress(edge.from));
      const to = nodeById.get(keyAddress(edge.to));
      if (!from || !to) return null;
      const count = Number(edge.count || 1);
      const labelX = (from.x + to.x) / 2;
      const labelY = (from.y + to.y) / 2 - 8;
      return {
        ...edge,
        path: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
        labelX,
        labelY,
        width: Math.min(8, 2 + Math.log2(count + 1)),
        label: formatTokens(edge.tokens, true),
        color: edgeColor(edge),
      };
    })
    .filter(Boolean);
});

const visibleEdges = computed(() => activeGraph.value.edges);

const selectedNode = computed(() => activeGraph.value.nodes.find((node) => node.id === selectedNodeId.value) || null);

watch(
  () => props.address,
  (next, previous) => {
    if (!pathSource.value || pathSource.value === previous) {
      pathSource.value = next;
    }
    pathStatus.value = "";
    pathError.value = "";
    pathGraph.value = null;
    pathResult.value = null;
    pathAbortController?.abort();
  },
);

watch(mode, (next) => {
  if (next === "direct") {
    pathAbortController?.abort();
  }
});

watch(
  activeGraph,
  (graph) => {
    if (!graph.nodes.length) {
      selectedNodeId.value = "";
      return;
    }
    if (!graph.nodes.some((node) => node.id === selectedNodeId.value)) {
      selectedNodeId.value = graph.nodes[0].id;
    }
  },
  { immediate: true },
);

async function searchPath() {
  const source = String(pathSource.value || "").trim();
  const target = String(pathTarget.value || "").trim();
  pathError.value = "";
  pathStatus.value = "";
  pathGraph.value = null;
  pathResult.value = null;

  if (!source || !target || (typeof props.fetchPath !== "function" && typeof props.fetchTransfers !== "function")) {
    pathError.value = t("addressDetail.radarPathInputError");
    return;
  }

  pathAbortController?.abort();
  pathAbortController = new AbortController();
  pathSearchSeq += 1;
  const currentSeq = pathSearchSeq;
  pathSearching.value = true;
  try {
    const payload = typeof props.fetchPath === "function"
      ? await props.fetchPath({
          source,
          target,
          depth: pathDepth.value,
          signal: pathAbortController.signal,
        })
      : {
          result: await findAddressTransferPath({
            sourceAddress: source,
            targetAddress: target,
            fetchTransfers: props.fetchTransfers,
            maxDepth: pathDepth.value,
            maxVisited: 36,
            perAddressLimit: 18,
            signal: pathAbortController.signal,
          }),
        };
    if (currentSeq !== pathSearchSeq) return;

    const result = payload?.result || payload;
    pathResult.value = result;
    if (result.found) {
      pathGraph.value = normalizeGraphPayload(payload?.graph) || buildAddressRadarPathGraph(result);
      pathStatus.value = "found";
    } else {
      pathStatus.value = "notFound";
    }
  } catch (error) {
    if (isAbortError(error) || currentSeq !== pathSearchSeq) return;
    pathError.value = t("addressDetail.radarPathSearchError");
  } finally {
    if (currentSeq === pathSearchSeq) {
      pathSearching.value = false;
    }
  }
}

onBeforeUnmount(() => {
  pathAbortController?.abort();
});

function normalizeGraphPayload(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return null;
  return {
    nodes: graph.nodes.slice(0, 32),
    edges: graph.edges.slice(0, 32),
    summary: {
      inboundAccounts: Number(graph.summary?.inboundAccounts || 0),
      outboundAccounts: Number(graph.summary?.outboundAccounts || 0),
      transferCount: Number(graph.summary?.transferCount || 0),
      hiddenCounterparties: Number(graph.summary?.hiddenCounterparties || 0),
      pathDepth: Number(graph.summary?.pathDepth || 0),
      visitedCount: Number(graph.summary?.visitedCount || 0),
    },
  };
}

function layoutGraph(graph, currentMode) {
  if (!graph.nodes.length) return [];
  return currentMode === "path" && pathGraph.value ? layoutPathNodes(graph.nodes) : layoutDirectNodes(graph.nodes);
}

function layoutDirectNodes(nodes) {
  const centerKey = keyAddress(props.address);
  const center = nodes.find((node) => node.id === centerKey || node.role === "center") || nodes[0];
  const sources = nodes.filter((node) => node.id !== center.id && node.role === "source");
  const sinks = nodes.filter((node) => node.id !== center.id && node.role === "sink");
  const bridges = nodes.filter((node) => node.id !== center.id && !sources.includes(node) && !sinks.includes(node));
  const result = [decorateNode(center, viewBox.width / 2, viewBox.height / 2, nodes.length)];

  distributeColumns(sources, [110, 210, 310], 85, 325, nodes.length).forEach((node) => result.push(node));
  distributeColumns(sinks, [610, 710, 810], 85, 325, nodes.length).forEach((node) => result.push(node));
  distributeColumns(bridges, [380, 460, 540], 330, 380, nodes.length).forEach((node) => result.push(node));

  return result;
}

function layoutPathNodes(nodes) {
  if (nodes.length === 1) return [decorateNode(nodes[0], viewBox.width / 2, viewBox.height / 2, nodes.length)];
  const startX = 115;
  const endX = viewBox.width - 115;
  const step = (endX - startX) / Math.max(1, nodes.length - 1);
  return nodes.map((node, index) => {
    const isEnd = index === 0 || index === nodes.length - 1;
    const y = isEnd ? viewBox.height / 2 : viewBox.height / 2 + (index % 2 === 0 ? 52 : -52);
    return decorateNode(node, startX + step * index, y, nodes.length);
  });
}

function distributeColumns(nodes, xValues, startY, endY, totalNodes) {
  if (!nodes.length) return [];
  const columnCount = Math.min(xValues.length, Math.max(1, Math.ceil(nodes.length / 7)));
  const perColumn = Math.ceil(nodes.length / columnCount);

  return nodes.map((node, index) => {
    const column = Math.min(columnCount - 1, Math.floor(index / perColumn));
    const indexInColumn = index - column * perColumn;
    const countInColumn = Math.min(perColumn, nodes.length - column * perColumn);
    const y =
      countInColumn === 1
        ? (startY + endY) / 2
        : startY + ((endY - startY) / Math.max(1, countInColumn - 1)) * indexInColumn;
    return decorateNode(node, xValues[column], y, totalNodes);
  });
}

function decorateNode(node, x, y, totalNodes) {
  const style = nodeStyle(node.role);
  return {
    ...node,
    x,
    y,
    radius: nodeRadius(node.role, totalNodes),
    label: shortAddress(node.address),
    initial: nodeInitial(node),
    roleLabel: nodeRoleLabel(node.role),
    ...style,
  };
}

function keyAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function shortAddress(value) {
  const text = String(value || "");
  if (text.length <= 14) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function formatTokenLabel(value, compact) {
  const label = String(value || "");
  if (compact && /^0x[0-9a-f]{20,}$/i.test(label)) {
    return `${label.slice(0, 8)}...${label.slice(-6)}`;
  }
  return label;
}

function formatTokens(tokens = [], compact = false) {
  const list = Array.isArray(tokens) ? tokens.filter(Boolean) : [];
  if (!list.length) return t("addressDetail.radarUnknownToken");
  const visible = list.slice(0, 2).map((token) => formatTokenLabel(token, compact)).join(", ");
  return list.length > 2 ? `${visible} +${list.length - 2}` : visible;
}

function nodeRoleLabel(role) {
  const labels = {
    center: "addressDetail.radarCenter",
    source: "addressDetail.radarSource",
    sink: "addressDetail.radarSink",
    bridge: "addressDetail.radarBridge",
    target: "addressDetail.radarTarget",
  };
  return t(labels[role] || "addressDetail.radarCounterparty");
}

function nodeStyle(role) {
  const styles = {
    center: { fill: "#0f766e", stroke: "#5eead4" },
    source: { fill: "#047857", stroke: "#86efac" },
    sink: { fill: "#b45309", stroke: "#fcd34d" },
    bridge: { fill: "#2563eb", stroke: "#93c5fd" },
    target: { fill: "#7c3aed", stroke: "#c4b5fd" },
  };
  return styles[role] || { fill: "#475569", stroke: "#cbd5e1" };
}

function nodeRadius(role, totalNodes) {
  if (role === "center") return totalNodes > 18 ? 25 : 30;
  if (totalNodes > 18) return 17;
  if (totalNodes > 12) return 20;
  return 24;
}

function nodeInitial(node) {
  const initials = {
    center: "C",
    source: "S",
    sink: "D",
    bridge: "B",
    target: "T",
  };
  return initials[node.role] || (node.address ? node.address[0].toUpperCase() : "?");
}

function edgeColor(edge) {
  if (mode.value === "path") return "#a78bfa";
  const center = keyAddress(props.address);
  if (keyAddress(edge.to) === center) return "#34d399";
  if (keyAddress(edge.from) === center) return "#f59e0b";
  return "#60a5fa";
}
</script>
