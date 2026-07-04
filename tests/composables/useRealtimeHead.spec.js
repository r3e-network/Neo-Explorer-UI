import { describe, it, expect, vi, beforeEach } from "vitest";

const pollStart = vi.fn();
const pollStop = vi.fn();

vi.mock("@/composables/useAutoRefresh", () => ({
  useAutoRefresh: () => ({ start: pollStart, stop: pollStop, isActive: { value: false } }),
}));
vi.mock("@/services/indexerReadService", () => ({
  getIndexerSseUrl: (network) => `/data/${network || "mainnet"}/sse/head`,
}));
vi.mock("@/utils/env", () => ({
  resolveNetworkName: () => "mainnet",
  NETWORK_CHANGE_EVENT: "network-change",
}));

import { useRealtimeHead } from "@/composables/useRealtimeHead";

class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.listeners = {};
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, cb) {
    (this.listeners[type] = this.listeners[type] || []).push(cb);
  }
  close() {
    this.readyState = 2; // CLOSED
  }
  open() {
    this.readyState = 1; // OPEN
    (this.listeners.open || []).forEach((cb) => cb({}));
  }
  emit(type, data) {
    (this.listeners[type] || []).forEach((cb) => cb({ data }));
  }
}

describe("useRealtimeHead", () => {
  beforeEach(() => {
    global.EventSource = FakeEventSource;
    FakeEventSource.instances = [];
    pollStart.mockClear();
    pollStop.mockClear();
  });

  it("invokes the callback with the parsed head payload and stops polling once live", () => {
    const cb = vi.fn();
    const rt = useRealtimeHead(cb);
    rt.start();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(pollStart).toHaveBeenCalled(); // polls until SSE proves healthy

    const es = FakeEventSource.instances[0];
    es.open();
    es.emit("head", JSON.stringify({ index: 42, network: "mainnet" }));

    expect(cb).toHaveBeenCalledWith({ index: 42, network: "mainnet" });
    expect(pollStop).toHaveBeenCalled(); // SSE is the live source now
    expect(rt.isConnected.value).toBe(true);

    rt.stop();
  });

  it("shares one EventSource per network across multiple consumers", () => {
    const a = useRealtimeHead(vi.fn());
    const b = useRealtimeHead(vi.fn());
    a.start();
    b.start();

    expect(FakeEventSource.instances).toHaveLength(1);

    a.stop();
    b.stop();
  });

  it("falls back to polling when EventSource is unavailable", () => {
    global.EventSource = undefined;
    const rt = useRealtimeHead(vi.fn());
    rt.start();
    expect(pollStart).toHaveBeenCalled();
    rt.stop();
  });

  it("keeps polling when EventSource opens but no head events arrive", () => {
    vi.useFakeTimers();
    const rt = useRealtimeHead(vi.fn());
    rt.start();

    const es = FakeEventSource.instances[0];
    es.open();
    pollStop.mockClear();

    vi.advanceTimersByTime(8000);

    expect(pollStop).not.toHaveBeenCalled();
    expect(rt.isConnected.value).toBe(false);

    rt.stop();
    vi.useRealTimers();
  });

  it("tears down the connection when the last subscriber stops", () => {
    const rt = useRealtimeHead(vi.fn());
    rt.start();
    const es = FakeEventSource.instances[0];
    rt.stop();
    expect(es.readyState).toBe(2); // CLOSED
  });
});
