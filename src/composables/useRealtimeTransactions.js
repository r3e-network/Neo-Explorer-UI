import { getCurrentInstance, onBeforeUnmount, ref } from "vue";
import { resolveNetworkName, NETWORK_CHANGE_EVENT } from "@/utils/env";
import { getIndexerSseTransactionsUrl } from "@/services/indexerReadService";

/**
 * Realtime "new transactions" subscription over Server-Sent Events.
 *
 * The read-api emits one `transactions` event per confirmed block, carrying
 * that block's transactions as `{ network, block_index, transactions: [...] }`.
 * This composable mirrors useRealtimeHead's shape: a shared per-network
 * EventSource, a polling fallback is NOT needed here (the caller's existing
 * transaction list polling remains the fallback), and graceful no-op when SSE
 * is unavailable (503 / EventSource missing) so the page keeps working via its
 * own polling.
 *
 * Usage:
 *   const { isConnected } = useRealtimeTransactions((payload) => {
 *     // payload.transactions is the array of new txs; prepend to the list
 *   }, { immediate: true });
 */

const REOPEN_THROTTLE_MS = 30_000;

// network -> shared hub
const hubs = new Map();

function nowMs() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function createHub(network) {
  const subscribers = new Set();
  let es = null;
  let lastOpenAttempt = 0;

  function dispatch(payload) {
    subscribers.forEach((cb) => {
      try {
        cb(payload);
      } catch {
        // a subscriber error must not break the stream for the others
      }
    });
  }

  function open() {
    if (es || typeof EventSource === "undefined") return;
    lastOpenAttempt = nowMs();
    let source;
    try {
      source = new EventSource(getIndexerSseTransactionsUrl(network));
    } catch {
      return;
    }
    es = source;
    source.addEventListener("transactions", (event) => {
      let payload = null;
      try {
        payload = event && event.data ? JSON.parse(event.data) : null;
      } catch {
        payload = null;
      }
      if (payload && Array.isArray(payload.transactions)) {
        dispatch(payload);
      }
    });
    source.addEventListener("error", () => {
      // A non-2xx (e.g. 503 when realtime is disabled) puts EventSource in
      // CLOSED and it will not auto-retry; ensureOpen re-opens on a throttle.
      // A transient drop stays CONNECTING and EventSource reconnects itself.
      if (source.readyState === 2 /* CLOSED */) {
        close();
      }
    });
  }

  function close() {
    if (es) {
      try {
        es.close();
      } catch {
        /* ignore */
      }
      es = null;
    }
  }

  function isConnected() {
    return Boolean(es) && es.readyState === 1 /* OPEN */;
  }

  function ensureOpen() {
    if (isConnected()) return;
    if (es && es.readyState === 0 /* CONNECTING */) return;
    if (nowMs() - lastOpenAttempt < REOPEN_THROTTLE_MS) return;
    close();
    open();
  }

  return {
    subscribe(cb) {
      subscribers.add(cb);
      open();
      return () => {
        subscribers.delete(cb);
        if (subscribers.size === 0) {
          close();
          hubs.delete(network);
        }
      };
    },
    isConnected,
    ensureOpen,
  };
}

function getHub(network) {
  let hub = hubs.get(network);
  if (!hub) {
    hub = createHub(network);
    hubs.set(network, hub);
  }
  return hub;
}

export function useRealtimeTransactions(callback, options = {}) {
  const hasComponentInstance = Boolean(getCurrentInstance());
  const isConnected = ref(false);
  const isIntentionallyActive = ref(false);

  let currentNetwork = "";
  let unsubscribe = null;

  function onTransactions(payload) {
    isConnected.value = true;
    try {
      callback(payload);
    } catch {
      /* surfaced by the caller */
    }
  }

  function attach() {
    detach();
    currentNetwork = String(resolveNetworkName() || "mainnet").trim().toLowerCase();
    const hub = getHub(currentNetwork);
    unsubscribe = hub.subscribe(onTransactions);
    isConnected.value = hub.isConnected();
  }

  function detach() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    isConnected.value = false;
  }

  function start() {
    isIntentionallyActive.value = true;
    attach();
  }

  function stop() {
    isIntentionallyActive.value = false;
    detach();
  }

  if (typeof window !== "undefined") {
    const onNetworkChange = () => {
      if (!isIntentionallyActive.value) return;
      attach();
    };
    window.addEventListener(NETWORK_CHANGE_EVENT, onNetworkChange);
    if (hasComponentInstance) {
      onBeforeUnmount(() => window.removeEventListener(NETWORK_CHANGE_EVENT, onNetworkChange));
    }
  }

  if (hasComponentInstance) onBeforeUnmount(stop);

  if (options.immediate) start();

  return { isConnected, start, stop };
}
