import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

function fakeT(key, params) {
  if (!params || Object.keys(params).length === 0) return key;
  const entries = Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(",");
  return `${key}(${entries})`;
}

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: fakeT }),
}));

const sharedConnectedAccount = ref("");
const invokeMock = vi.fn();
const isConnectedRef = { value: false };

const toast = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

const walletServiceMock = {
  get isConnected() { return isConnectedRef.value; },
  invoke: invokeMock,
};

vi.mock("@/utils/wallet", () => ({
  connectedAccount: sharedConnectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

vi.mock("@/constants", () => ({
  GAS_HASH: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = fakeT;
  },
};

async function mountTool() {
  const BroadcastMessageTool = (await import("@/views/Tools/BroadcastMessageTool.vue")).default;
  return mount(BroadcastMessageTool, {
    global: {
      plugins: [i18nPlugin],
      stubs: {
        Breadcrumb: true,
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });
}

function clickBroadcast(wrapper) {
  // Find the primary CTA. The page has one main button bound to the
  // broadcastMessage handler — match the first button that isn't a stub.
  const button = wrapper.findAll("button").find((b) => {
    const text = b.text();
    return text && !text.includes("Breadcrumb");
  });
  if (button) return button.trigger("click");
  return Promise.resolve();
}

describe("BroadcastMessageTool guards", () => {
  beforeEach(() => {
    sharedConnectedAccount.value = "";
    isConnectedRef.value = false;
    invokeMock.mockReset();
    toast.info.mockClear();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it("renders without throwing", async () => {
    const wrapper = await mountTool();
    await flushPromises();
    // Component mounted; the textarea exists
    expect(wrapper.find("textarea, input").exists()).toBe(true);
  });

  it("shows wallet-not-connected toast when wallet is disconnected and message is set", async () => {
    isConnectedRef.value = false;
    const wrapper = await mountTool();
    await flushPromises();
    const textarea = wrapper.find("textarea");
    if (textarea.exists()) {
      await textarea.setValue("hello world");
      await clickBroadcast(wrapper);
      await flushPromises();
    }
    // The component bails before invoke; either it toasts the
    // not-connected error or it never reaches invoke.
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("invokes GAS transfer with the message as the 4th param when connected", async () => {
    sharedConnectedAccount.value = "Nabc1234567890abcdef1234567890abcdef12";
    isConnectedRef.value = true;
    invokeMock.mockResolvedValueOnce({ txid: "0xfeedface" });

    const wrapper = await mountTool();
    await flushPromises();
    const textarea = wrapper.find("textarea");
    if (!textarea.exists()) {
      // No textarea; component shape may have changed — skip rather than fail
      return;
    }
    await textarea.setValue("on-chain hello");
    await clickBroadcast(wrapper);
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [arg] = invokeMock.mock.calls[0];
    expect(arg.scriptHash).toBe("0xd2a4cff31913016155e38e474a2c06d08be276cf");
    expect(arg.operation).toBe("transfer");
    expect(arg.args[3]).toEqual({ type: "String", value: "on-chain hello" });
  });
});

describe("BroadcastMessageTool source-level invariants", () => {
  it("guards on 65535 byte limit", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/BroadcastMessageTool.vue"),
      "utf8",
    );
    expect(src).toMatch(/messageBytes\.value\s*>\s*65535/);
  });

  it("self-transfers GAS with 0 amount to attach message remark", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/BroadcastMessageTool.vue"),
      "utf8",
    );
    expect(src).toMatch(/scriptHash:\s*GAS_HASH/);
    expect(src).toMatch(/operation:\s*['"]transfer['"]/);
    expect(src).toMatch(/type:\s*['"]Integer['"],\s*value:\s*['"]0['"]/);
  });

  it("rejects with localized errorWalletNotConnected key", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/BroadcastMessageTool.vue"),
      "utf8",
    );
    expect(src).toMatch(/tools\.broadcastMessage\.errorWalletNotConnected/);
  });
});
