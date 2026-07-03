import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "@/composables/useCountUp";

describe("useCountUp", () => {
  let rafQueue;

  beforeEach(() => {
    rafQueue = [];
    vi.stubGlobal("requestAnimationFrame", (callback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flushFrame(timestamp) {
    const callbacks = rafQueue.splice(0);
    callbacks.forEach((callback) => callback(timestamp));
  }

  it("responds when an async metric changes after the initial zero render", async () => {
    const target = ref(0);
    const wrapper = mount({
      setup() {
        const { display } = useCountUp(target, { duration: 100, decimals: 0 });
        return { display };
      },
      template: "<span>{{ display }}</span>",
    });

    flushFrame(0);
    flushFrame(100);
    expect(wrapper.text()).toBe("0");

    target.value = 12;
    await nextTick();
    flushFrame(200);
    flushFrame(300);
    await nextTick();

    expect(wrapper.text()).toBe("12");
  });
});
