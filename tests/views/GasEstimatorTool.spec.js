import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const toast = {
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

const invokeScriptMock = vi.fn(async () => ({
  state: "HALT",
  gasconsumed: "100000000",
  exception: "",
}));
const getBlockCountMock = vi.fn(async () => 123);
const calculateNetworkFeeMock = vi.fn(async () => "2000000");

class MockRpcClient {
  async invokeScript(script, signers) {
    return invokeScriptMock(script, signers);
  }

  async getBlockCount() {
    return getBlockCountMock();
  }

  async calculateNetworkFee(tx) {
    return calculateNetworkFeeMock(tx);
  }
}

class MockTransaction {
  constructor(data = {}) {
    this.data = data;
  }

  sign() {
    return this;
  }

  serialize() {
    return "serialized-tx";
  }
}

class MockAccount {
  constructor(value = "") {
    this.address = value || "NdummySigner";
    this.scriptHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  }
}

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

vi.mock("@/utils/sdkCompat", () => ({
  base642hex: vi.fn(() => "01"),
  hex2base64: vi.fn((value) => `base64:${value}`),
}));

const callWithRpcEndpointFallbackMock = vi.fn(async (_env, callback) => callback("https://rpc.example"));

vi.mock("@/utils/rpcEndpoints", () => ({
  callWithRpcEndpointFallback: callWithRpcEndpointFallbackMock,
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => "Mainnet",
}));

vi.mock("@/components/common/Breadcrumb.vue", () => ({
  default: {
    name: "Breadcrumb",
    template: "<div />",
  },
}));

describe("GasEstimatorTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.Neon = {
      rpc: { RPCClient: MockRpcClient },
      tx: {
        Transaction: MockTransaction,
        WitnessScope: { CalledByEntry: 1 },
      },
      wallet: {
        Account: MockAccount,
      },
    };
  });

  it("estimates fees with the SDK compatibility namespaces", async () => {
    const GasEstimatorTool = (await import("@/views/Tools/GasEstimatorTool.vue")).default;
    const wrapper = mount(GasEstimatorTool, {
      global: {
        plugins: [i18nPlugin],
      },
    });

    await wrapper.find("textarea").setValue("AQ==");
    const estimateButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("tools.gasEstimator.estimateFees"));
    await estimateButton.trigger("click");
    await flushPromises();

    expect(invokeScriptMock).toHaveBeenCalledWith(
      "base64:01",
      [{ account: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", scopes: 1 }],
    );
    // calculateNetworkFee receives the Transaction instance directly; neon-js
    // serializes it internally, so we just assert the mock was called once.
    expect(calculateNetworkFeeMock).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("tools.gasEstimator.toastComplete");
    expect(wrapper.text()).toContain("tools.gasEstimator.totalEstimatedCost");
  });
});
