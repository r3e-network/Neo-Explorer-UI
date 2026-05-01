import { mount, config } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

describe("ScriptViewer", () => {
  it("renders call flags on the flag instruction line and keeps the call summary on the syscall line", async () => {
    const contractHash = "0x48c40d4666f93408be1bef038b6722404d9a4c2a";
    const hashBytes = contractHash
      .replace(/^0x/i, "")
      .match(/.{2}/g)
      .reverse()
      .map((pair) => Number.parseInt(pair, 16));

    const method = "balanceOf";
    const methodBytes = Array.from(method).map((ch) => ch.charCodeAt(0));

    const script = bytesToBase64([
      0x0c,
      0x00,
      0x15,
      0x0c,
      methodBytes.length,
      ...methodBytes,
      0x0c,
      hashBytes.length,
      ...hashBytes,
      0x41,
      0x62,
      0x7d,
      0x5b,
      0x52,
    ]);

    const component = (await import("@/components/trace/ScriptViewer.vue")).default;
    const wrapper = mount(component, {
      props: {
        script,
        label: "Invocation Script",
      },
      global: {
        stubs: {
          CopyButton: { template: "<button>copy</button>", props: ["text"] },
          HashLink: { template: "<span><slot />{{ hash }}</span>", props: ["hash"] },
        },
      },
    });

    const text = wrapper.text();
    expect(text).toContain("PUSH5");
    expect(text).toContain("CallFlag:");
    expect(text).toContain("ReadStates|AllowCall");
    expect(text).toContain("SYSCALL");
    expect(text).toContain("Call:");
    expect(text).toContain("bNEO.balanceOf(...)");
    expect(text).not.toContain("Call: bNEO.balanceOf(...) [ReadOnly:");
  });
});
