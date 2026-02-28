import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const sharedConnectedAccount = ref("");
const getMultisigRequestsMock = vi.fn();
const invokeMock = vi.fn();
const signMessageMock = vi.fn();
const toast = {
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

const walletServiceMock = {
  PROVIDERS: {
    NEOLINE: "NeoLine",
    WEB3AUTH: "Google / Email (Web3Auth)",
  },
  isConnected: false,
  provider: "NeoLine",
  invoke: invokeMock,
  signMessage: signMessageMock,
};

class MockRpcClient {
  async getStorage() {
    return "";
  }

  async invokeScript() {
    return { state: "HALT", gasconsumed: "0" };
  }

  async getBlockCount() {
    return 123;
  }

  async calculateNetworkFee() {
    return "0";
  }
}

class MockTransaction {
  constructor(config = {}) {
    Object.assign(this, config);
  }

  sign() {}
}

class MockScriptBuilder {
  emitAppCall() {}

  build() {
    return "00";
  }
}

class MockAccount {
  constructor(address = "") {
    this.address = address;
    this.scriptHash = "0x" + "1".repeat(40);
  }
}

const neonUtils = {
  str2hexstring(value) {
    return Buffer.from(String(value), "utf8").toString("hex");
  },
  hexstring2str(value) {
    return Buffer.from(String(value).replace(/^0x/, ""), "hex").toString("utf8");
  },
  hex2base64(value) {
    return Buffer.from(String(value).replace(/^0x/, ""), "hex").toString("base64");
  },
  base642hex(value) {
    return Buffer.from(String(value), "base64").toString("hex");
  },
  reverseHex(value) {
    const bytes = String(value).match(/../g) || [];
    return bytes.reverse().join("");
  },
  BigInteger: {
    fromTwos: () => ({
      toString: () => "0",
    }),
  },
};

vi.mock("@/utils/wallet", () => ({
  connectedAccount: sharedConnectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getMultisigRequests: getMultisigRequestsMock,
  },
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => "Mainnet",
  NET_ENV: { Mainnet: "Mainnet", TestT5: "TestNet" },
}));

vi.mock("@/utils/explorerFormat", () => ({
  formatBytes: (value) => `${value} B`,
}));

vi.mock("@/utils/scriptDisassembler", () => ({
  disassembleScript: () => [],
  extractContractInvocation: () => null,
}));

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

vi.mock("@cityofzion/neon-js", () => ({
  rpc: { RPCClient: MockRpcClient },
  tx: {
    Transaction: MockTransaction,
    WitnessScope: { CalledByEntry: 1 },
  },
  sc: {
    ContractParam: {
      fromJson: (value) => value,
    },
    ScriptBuilder: MockScriptBuilder,
  },
  u: neonUtils,
  wallet: { Account: MockAccount },
}));

const toolPages = [
  {
    id: "ToolsIndex",
    heading: "Tools",
    load: () => import("@/views/Tools/ToolsIndex.vue"),
  },
  {
    id: "MultiSigTool",
    heading: "Multi-Signature Wallet",
    load: () => import("@/views/Tools/MultiSigTool.vue"),
  },
  {
    id: "GovernanceTool",
    heading: "Council Governance",
    load: () => import("@/views/Tools/GovernanceTool.vue"),
  },
  {
    id: "FormatConverterTool",
    heading: "Format Converter",
    load: () => import("@/views/Tools/FormatConverterTool.vue"),
  },
  {
    id: "NeoFSTool",
    heading: "NeoFS Gateway",
    load: () => import("@/views/Tools/NeoFSTool.vue"),
  },
  {
    id: "BroadcastMessageTool",
    heading: "On-Chain Message",
    load: () => import("@/views/Tools/BroadcastMessageTool.vue"),
  },
  {
    id: "ContractDeployerTool",
    heading: "Contract Deployer",
    load: () => import("@/views/Tools/ContractDeployerTool.vue"),
  },
  {
    id: "ContractFactoryTool",
    heading: "Contract Factory",
    load: () => import("@/views/Tools/ContractFactoryTool.vue"),
  },
  {
    id: "AbiEncoderTool",
    heading: "ABI Encoder & Decoder",
    load: () => import("@/views/Tools/AbiEncoderTool.vue"),
  },
  {
    id: "StorageInspectorTool",
    heading: "Storage Inspector",
    load: () => import("@/views/Tools/StorageInspectorTool.vue"),
  },
  {
    id: "GasEstimatorTool",
    heading: "Gas Estimator & Fee Calculator",
    load: () => import("@/views/Tools/GasEstimatorTool.vue"),
  },
];

describe("Tool views smoke coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedConnectedAccount.value = "";
    walletServiceMock.isConnected = false;
    walletServiceMock.provider = walletServiceMock.PROVIDERS.NEOLINE;
    getMultisigRequestsMock.mockResolvedValue([]);
    invokeMock.mockResolvedValue({ txid: "0xabc123" });
    signMessageMock.mockResolvedValue({ signature: "0xsig" });
  });

  it.each(toolPages)("renders $id", async ({ load, heading }) => {
    const component = (await load()).default;
    const wrapper = mount(component, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
          Skeleton: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.find("h1").exists()).toBe(true);
    expect(wrapper.find("h1").text()).toContain(heading);
    wrapper.unmount();
  });
});
