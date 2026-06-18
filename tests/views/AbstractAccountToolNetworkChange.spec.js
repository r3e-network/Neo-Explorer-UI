import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
    locale: { value: "en" },
  }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};
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

vi.mock("vue-toastification", () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

describe("AbstractAccountTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    envState.value = "Mainnet";
    window.Neon = {
      rpc: {
        RPCClient: class {},
      },
      tx: {
        Transaction: {
          deserialize: vi.fn(),
        },
      },
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

  it("handles explorer network changes without crashing", async () => {
    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
          highlightjs: true,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });
});
