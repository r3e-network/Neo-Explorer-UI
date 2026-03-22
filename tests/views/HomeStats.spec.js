import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/env", async () => {
  const actual = await vi.importActual("@/utils/env");
  return {
    ...actual,
    getCurrentEnv: vi.fn(() => actual.NET_ENV.Mainnet),
  };
});

describe("HomeStats countdown refresh behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits fetch-latest continuously when overdue (HomePage handles throttling)", async () => {
    const HomeStats = (await import("@/views/Home/components/HomeStats.vue")).default;
    const overdueTimestamp = Math.floor((Date.now() - 45_000) / 1000);
    const wrapper = mount(HomeStats, {
      props: {
        latestBlockTimestamp: overdueTimestamp,
      },
      global: {
        stubs: {
          "router-link": true,
        },
      },
    });

    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(1);

    vi.advanceTimersByTime(4_000);
    await vi.dynamicImportSettled();

    // Emits once on mount + 4 times from interval
    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(5);
    wrapper.unmount();
  });

  it("emits again when a new overdue block timestamp arrives", async () => {
    const HomeStats = (await import("@/views/Home/components/HomeStats.vue")).default;
    const firstTimestamp = Math.floor((Date.now() - 45_000) / 1000);
    const secondTimestamp = Math.floor((Date.now() - 35_000) / 1000);

    const wrapper = mount(HomeStats, {
      props: {
        latestBlockTimestamp: firstTimestamp,
      },
      global: {
        stubs: {
          "router-link": true,
        },
      },
    });

    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(1);

    await wrapper.setProps({ latestBlockTimestamp: secondTimestamp });
    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(2);
    wrapper.unmount();
  });
});
