import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const envState = { value: "Mainnet" };
const connectedAccount = ref("Nconnected");

const getAbstractAccountHashMock = vi.fn(() =>
  envState.value === "TestT5" ? "0xtesthash" : "0xmainhash"
);

vi.mock("@/utils/wallet", () => ({
  connectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: {
    provider: "NeoLine",
    PROVIDERS: { EVM_WALLET: "EVM Wallets (MetaMask, OKX, Rabby, etc.)" },
    account: null,
    isConnected: true,
    invoke: vi.fn(),
  },
  getAbstractAccountHash: getAbstractAccountHashMock,
}));

vi.mock("@/utils/env", () => ({
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
}));

vi.mock("@highlightjs/vue-plugin", () => ({
  default: { component: { name: "highlightjs", template: "<pre><slot /></pre>" } },
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

describe("AbstractAccountTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.value = "Mainnet";
    window.Neon = {
      sc: {
        createScript: ({ scriptHash, args }) => `script:${scriptHash}:${args[0]?.value || ""}`,
        ContractParam: { byteArray: (value) => ({ value }) },
      },
      u: {
        HexString: { fromHex: (value) => value },
        hash160: (value) => value,
        reverseHex: (value) => value,
      },
      wallet: {
        getAddressFromScriptHash: (value) => value,
        getScriptHashFromAddress: () => "0xabc",
      },
    };
  });

  it("re-derives the computed address when the explorer network changes", async () => {
    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
          highlightjs: true,
        },
      },
    });

    const input = wrapper.get('input[placeholder*="550e8400"]');
    await input.setValue("user-seed");
    await flushPromises();

    expect(wrapper.html()).toContain("0xmainhash");

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(wrapper.html()).toContain("0xtesthash");
    wrapper.unmount();
  });
});
