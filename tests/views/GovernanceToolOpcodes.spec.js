import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const getMultisigRequestsMock = vi.fn();
const getValidatorMetadataMock = vi.fn();
const getCommitteeMock = vi.fn();
const connectedAccount = ref("");
const walletServiceMock = {
  isConnected: false,
  signRawTransaction: vi.fn(),
};

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getMultisigRequests: getMultisigRequestsMock,
    getValidatorMetadata: getValidatorMetadataMock,
    createMultisigRequest: vi.fn(),
    addMultisigSignature: vi.fn(),
    getMultisigRequestById: vi.fn(),
    updateMultisigRequestStatus: vi.fn(),
  },
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

vi.mock("@/components/trace/ScriptViewer.vue", () => ({
  default: { name: "ScriptViewer", props: ["label"], template: "<div>{{ label }}</div>" },
}));

vi.mock("@/utils/env", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getRpcClientUrl: () => "http://rpc.test",
  getCurrentEnv: () => "Mainnet",
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
}));

vi.mock("@/utils/rpcEndpoints", () => ({
  toNetworkMode: () => "mainnet",
}));

vi.mock("@/utils/governanceRequests", () => ({
  isGovernanceRequest: (request) => String(request?.type || "").toLowerCase() === "governance",
  matchesRequestNetwork: () => true,
}));

describe("GovernanceTool opcode display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectedAccount.value = "";
    walletServiceMock.isConnected = false;
    window.Neon = {
      wallet: {
        Account: class {
          constructor(value) {
            this.address = `A${value}`;
            this.scriptHash = "0xabc";
          }
          static createMultiSig() {
            return { address: "NGOV", scriptHash: "0xabc", contract: { script: "script" } };
          }
        },
      },
      tx: {
        WitnessScope: { Global: 1 },
        Witness: class {},
        Transaction: class {
          constructor(config) {
            Object.assign(this, config);
          }
          serialize() {
            return "001122";
          }
          hash() {
            return "0xdeadbeef";
          }
        },
      },
      rpc: {
        RPCClient: class {
          async getCommittee() {
            return getCommitteeMock();
          }
          async getBlockCount() {
            return 123;
          }
        },
      },
      sc: {
        ContractParam: {
          fromJson: (value) => value,
          integer: (value) => value,
          hash160: (value) => value,
          any: (value) => value,
          array: (value) => value,
          string: (value) => value,
        },
        createScript: vi.fn(() => "51"),
      },
      u: { HexString: { fromHex: (value) => value } },
    };
    getCommitteeMock.mockResolvedValue(["PK1", "PK2", "PK3", "PK4"]);
    getValidatorMetadataMock.mockResolvedValue([]);
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 1,
        type: "governance",
        description: "Mainnet Proposal",
        method: "setFeePerByte",
        target_contract: "0xcc5e",
        network: "mainnet",
        signatures: [],
        eligible_signers: [],
        params: {
          unsigned_tx:
            "007e5263f000e1f505000000000065cd1d00000000ad84dd0001aa72bef4c00356e5a63303e3f475789b1ef1f87b80003001e80311c01f0c0d736574466565506572427974650c147bc681c0a1f71d543457b68bba8d5f9fdd4e5ecc41627d5b52",
        },
      },
    ]);
  });

  it("shows a decoded opcode view in the proposal details modal", async () => {
    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const detailsButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("View JSON / Details"));
    await detailsButton.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Unsigned Transaction Packet");
    expect(wrapper.text()).toContain("Embedded Execution Script");
  });
});
