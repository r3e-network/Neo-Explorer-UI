import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  async calculateNetworkFee(txn) {
    return calculateNetworkFeeMock(txn);
  }
}

class MockTransaction {
  constructor(data = {}) {
    this.data = data;
  }

  sign() {
    return this;
  }
}

class MockAccount {
  constructor(value = "") {
    this.address = value || "NdummySigner";
    this.scriptHash = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  }
}

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

vi.mock("@r3e/neo-js-sdk", () => ({
  rpc: { RPCClient: MockRpcClient },
  tx: {
    Transaction: MockTransaction,
    WitnessScope: { CalledByEntry: 1 },
  },
  wallet: {
    Account: MockAccount,
  },
}));

describe("GasEstimatorTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("estimates fees with the SDK compatibility namespaces", async () => {
    const GasEstimatorTool = (await import("@/views/Tools/GasEstimatorTool.vue")).default;
    const wrapper = mount(GasEstimatorTool);

    await wrapper.find("textarea").setValue("AQ==");
    const estimateButton = wrapper.findAll("button").find((button) => button.text().includes("Estimate Fees"));
    await estimateButton.trigger("click");
    await flushPromises();

    expect(invokeScriptMock).toHaveBeenCalledWith("base64:01", [
      { account: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", scopes: 1 },
    ]);
    expect(calculateNetworkFeeMock).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Simulation complete!");
    expect(wrapper.text()).toContain("Total Estimated Cost");
  });
});
