import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/env", async () => {
  const actual = await vi.importActual("@/utils/env");
  return {
    ...actual,
    getCurrentEnv: vi.fn(() => actual.NET_ENV.Mainnet),
  };
});

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

// HomeStats now uses $t for stat labels — provide a passthrough so the
// keys render and the countdown emits assertions still apply.
const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key, params) => {
      if (params && typeof params === "object") {
        return Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(new RegExp(`{${k}}`, "g"), String(v)),
          key,
        );
      }
      return key;
    };
  },
};

describe("HomeStats countdown refresh behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits fetch-latest only once per overdue block timestamp", async () => {
    const HomeStats = (await import("@/views/Home/components/HomeStats.vue")).default;
    const overdueTimestamp = Math.floor((Date.now() - 45_000) / 1000);
    const wrapper = mount(HomeStats, {
      props: {
        latestBlockTimestamp: overdueTimestamp,
      },
      global: {
        plugins: [i18nPlugin],
        stubs: {
          "router-link": true,
        },
      },
    });

    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(1);

    vi.advanceTimersByTime(4_000);
    await vi.dynamicImportSettled();

    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(1);
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
        plugins: [i18nPlugin],
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

  it("treats a 4 second old mainnet block as overdue so homepage refresh starts sooner", async () => {
    const HomeStats = (await import("@/views/Home/components/HomeStats.vue")).default;
    const nearTipTimestamp = Math.floor((Date.now() - 4_000) / 1000);
    const wrapper = mount(HomeStats, {
      props: {
        latestBlockTimestamp: nearTipTimestamp,
      },
      global: {
        plugins: [i18nPlugin],
        stubs: {
          "router-link": true,
        },
      },
    });

    expect(wrapper.emitted("fetch-latest")?.length || 0).toBe(1);
    wrapper.unmount();
  });

  it("marks the validated state root badge with a green check", async () => {
    const HomeStats = (await import("@/views/Home/components/HomeStats.vue")).default;
    const wrapper = mount(HomeStats, {
      props: {
        blockCount: 12,
        validatedStateRoot: {
          validated: true,
          validatedrootindex: 12,
          roothash: "0xstate",
        },
      },
      global: {
        plugins: [i18nPlugin],
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
        },
      },
    });

    expect(wrapper.text()).toContain("✅");
    expect(wrapper.text()).toContain("homePage.validatedBadge");
    expect(wrapper.text()).toContain("homePage.miniValidatedStateRoot");
    expect(wrapper.text().match(/homePage\.validatedBadge/g)?.length).toBe(2);
    wrapper.unmount();
  });

  it("does not mark block height validated when the validated root is ahead of displayed height", async () => {
    const HomeStats = (await import("@/views/Home/components/HomeStats.vue")).default;
    const wrapper = mount(HomeStats, {
      props: {
        blockCount: 11,
        validatedStateRoot: {
          validated: true,
          validatedrootindex: 12,
          roothash: "0xstate",
        },
      },
      global: {
        plugins: [i18nPlugin],
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
        },
      },
    });

    expect(wrapper.text()).toContain("✅");
    expect(wrapper.text()).toContain("homePage.miniValidatedStateRoot");
    expect(wrapper.text().match(/homePage\.validatedBadge/g)?.length).toBe(1);
    wrapper.unmount();
  });
});
