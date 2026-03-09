import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const envState = { value: "Mainnet" };
const getMultisigRequestsMock = vi.fn();
const connectedAccount = ref("");
const getCommitteeMock = vi.fn();

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getMultisigRequests: getMultisigRequestsMock,
    createMultisigRequest: vi.fn(),
    addMultisigSignature: vi.fn(),
  },
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: {
    isConnected: false,
    signRawTransaction: vi.fn(),
  },
}));

vi.mock("@/utils/env", () => ({
  getRpcUrl: () => "http://rpc.test",
  getCurrentEnv: () => envState.value,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
}));

vi.mock("@/utils/rpcEndpoints", () => ({
  toNetworkMode: (value) => String(value || "").toLowerCase().includes("test") ? "testnet" : "mainnet",
}));

vi.mock("@/utils/governanceRequests", () => ({
  isGovernanceRequest: (request) => String(request?.type || "").toLowerCase() === "governance",
  matchesRequestNetwork: (request, activeNetwork) => {
    const normalizedActive = String(activeNetwork || "").toLowerCase().includes("test") ? "testnet" : "mainnet";
    const normalizedRequest = String(request?.network || "mainnet").toLowerCase().includes("test") ? "testnet" : "mainnet";
    return normalizedRequest === normalizedActive;
  },
}));

describe("GovernanceTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.value = "Mainnet";
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
      tx: { WitnessScope: { Global: 1 }, Witness: class {}, Transaction: class {} },
      rpc: {
        RPCClient: class {
          async getCommittee() {
            return getCommitteeMock();
          }
        },
      },
      sc: { ContractParam: { fromJson: (value) => value }, createScript: vi.fn() },
      u: { HexString: { fromHex: (value) => value } },
    };
    getCommitteeMock.mockResolvedValue(["PK1", "PK2", "PK3", "PK4"]);
    getMultisigRequestsMock.mockResolvedValue([
      { id: 1, type: "governance", description: "Mainnet Proposal", network: "mainnet", signatures: [], eligible_signers: [] },
      { id: 2, type: "governance", description: "Testnet Proposal", network: "testnet", signatures: [], eligible_signers: [] },
      { id: 3, type: "multisig", description: "Wallet Request", network: "mainnet", signatures: [], eligible_signers: [] },
    ]);
  });

  it("reloads committee state and proposal list for the active network", async () => {
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
    expect(wrapper.html()).toContain("Mainnet Proposal");
    expect(wrapper.html()).not.toContain("Testnet Proposal");
    expect(wrapper.html()).not.toContain("Wallet Request");

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(getCommitteeMock).toHaveBeenCalledTimes(2);
    expect(getMultisigRequestsMock).toHaveBeenCalledTimes(2);
    expect(wrapper.html()).not.toContain("Mainnet Proposal");
    expect(wrapper.html()).toContain("Testnet Proposal");
    wrapper.unmount();
  });
});
