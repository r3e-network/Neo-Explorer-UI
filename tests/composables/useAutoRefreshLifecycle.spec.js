import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useAutoRefresh lifecycle registration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not register keep-alive lifecycle hooks when called outside a component instance", async () => {
    const onActivated = vi.fn();
    const onDeactivated = vi.fn();
    const onBeforeUnmount = vi.fn();

    vi.doMock("vue", async () => {
      const actual = await vi.importActual("vue");
      return {
        ...actual,
        getCurrentInstance: () => null,
        onActivated,
        onDeactivated,
        onBeforeUnmount,
      };
    });

    const { useAutoRefresh } = await import("../../src/composables/useAutoRefresh.js");
    useAutoRefresh(vi.fn());

    expect(onActivated).not.toHaveBeenCalled();
    expect(onDeactivated).not.toHaveBeenCalled();
  });
});
