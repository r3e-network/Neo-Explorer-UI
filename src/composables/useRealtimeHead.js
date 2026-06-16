import { getCurrentInstance, onBeforeUnmount, ref } from "vue";
import { resolveNetworkName, NETWORK_CHANGE_EVENT } from "@/utils/env";
import { getIndexerSseUrl } from "@/services/indexerReadService";
import { useAutoRefresh } from "@/composables/useAutoRefresh";

/**
 * Realtime "new head" subscription over Server-Sent Events, with the existing
 * fixed-interval polling kept as an always-on fallback.
 *
 * It mirrors {@link useAutoRefresh}'s contract — `useRealtimeHead(callback, opts)`
 * returning `{ start, stop, isConnected }` — so it is a drop-in replacement for
 * the home/head poll: `callback` runs on every pushed head event, and when the
 * SSE lane is unavailable (server has no realtime DSN, proxy buffering, network
 * drop) a watchdog transparently falls back to polling. Net behaviour: SSE up →
 * push-driven, far fewer requests; SSE down → today's polling, unchanged.
 *
 * EventSource connections are shared per-network at module scope, so multiple
 * components on a page (or rapid remounts) reuse ONE connection instead of the
 * one-stream-per-consumer cost of the retired WebSocket.
 */

const WATCHDOG_INTERVAL_MS = 8_000;
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
      source = new EventSource(getIndexerSseUrl(network));
    } catch {
      return;
    }
    es = source;
    source.addEventListener("head", (event) => {
      let payload = null;
      try {
        payload = event && event.data ? JSON.parse(event.data) : null;
      } catch {
        payload = null;
      }
      dispatch(payload);
    });
    source.addEventListener("error", () => {
      // A non-2xx (e.g. 503 when realtime is disabled) puts EventSource in
      // CLOSED and it will not auto-retry; the watchdog re-opens on a throttle.
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

  // Reopen a closed stream on a throttle so a client that loaded while realtime
  // was disabled recovers once the server enables it, without a retry storm.
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

export function useRealtimeHead(callback, options = {}) {
  const hasComponentInstance = Boolean(getCurrentInstance());
  const isConnected = ref(false);
  const isIntentionallyActive = ref(false);

  // Polling fallback — created but NOT started; the watchdog runs it only while
  // SSE is unhealthy. immediate:false so the page's own initial load owns first paint.
  const pollFallback = useAutoRefresh(callback, { ...options, immediate: false });

  let currentNetwork = "";
  let unsubscribe = null;
  let watchdogId = null;

  function onHead(payload) {
    // A head arrived → SSE is the live source; ensure polling is stopped.
    isConnected.value = true;
    pollFallback.stop();
    try {
      callback(payload);
    } catch {
      /* surfaced by the caller */
    }
  }

  function syncFallback() {
    const hub = currentNetwork ? hubs.get(currentNetwork) : null;
    const connected = Boolean(hub && hub.isConnected());
    isConnected.value = connected;
    if (connected) {
      pollFallback.stop();
    } else {
      if (hub) hub.ensureOpen();
      pollFallback.start();
    }
  }

  function attach() {
    detach();
    currentNetwork = String(resolveNetworkName() || "mainnet").trim().toLowerCase();
    const hub = getHub(currentNetwork);
    unsubscribe = hub.subscribe(onHead);
    // Until SSE proves healthy, poll. The first watchdog tick (or a head event)
    // flips this off once connected.
    pollFallback.start();
    syncFallback();
    if (watchdogId === null) {
      watchdogId = setInterval(syncFallback, WATCHDOG_INTERVAL_MS);
    }
  }

  function detach() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (watchdogId !== null) {
      clearInterval(watchdogId);
      watchdogId = null;
    }
    pollFallback.stop();
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
      attach(); // re-subscribe to the new network's hub, restart watchdog
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
