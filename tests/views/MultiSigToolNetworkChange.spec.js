import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

const envState = { value: "Mainnet" };
const getMultisigRequestsMock = vi.fn();
const connectedAccount = ref("");

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
  getRpcClientUrl: () => "http://rpc.test",
  getCurrentEnv: () => envState.value,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
}));

vi.mock("@/utils/rpcEndpoints", () => ({
  toNetworkMode: (value) =>
    String(value || "")
      .toLowerCase()
      .includes("test")
      ? "testnet"
      : "mainnet",
}));

vi.mock("@/utils/governanceRequests", () => ({
  isGovernanceRequest: (request) => String(request?.type || "").toLowerCase() === "governance",
  matchesRequestNetwork: (request, activeNetwork) => {
    const normalizedActive = String(activeNetwork || "")
      .toLowerCase()
      .includes("test")
      ? "testnet"
      : "mainnet";
    const normalizedRequest = String(request?.network || "mainnet")
      .toLowerCase()
      .includes("test")
      ? "testnet"
      : "mainnet";
    return normalizedRequest === normalizedActive;
  },
}));

describe("MultiSigTool network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    envState.value = "Mainnet";
    window.Neon = {
      wallet: {
        Account: class {
          constructor(value) {
            this.address = `A${value}`;
            this.scriptHash = "0xabc";
          }
          static createMultiSig() {
            return { address: "NMULTI", scriptHash: "0xabc" };
          }
        },
      },
      tx: {
        WitnessScope: { Global: 1 },
        Witness: class {},
        Transaction: class {
          static deserialize() {
            return {
              hash: () => "deadbeef".repeat(8).slice(0, 64),
              serialize: () => "001122",
              script: { toString: () => "" },
              signers: [],
              attributes: [],
              systemFee: "0",
              networkFee: "0",
              validUntilBlock: 0,
              version: 0,
              nonce: 0,
            };
          }
        },
      },
      rpc: { RPCClient: class {} },
      sc: { ContractParam: { fromJson: (value) => value }, createScript: vi.fn() },
      u: { HexString: { fromHex: (value) => value } },
    };
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 1,
        type: "multisig",
        description: "Mainnet Request",
        network: "mainnet",
        signatures: [],
        eligible_signers: [],
      },
      {
        id: 2,
        type: "multisig",
        description: "Testnet Request",
        network: "testnet",
        signatures: [],
        eligible_signers: [],
      },
      {
        id: 3,
        type: "governance",
        description: "Governance Request",
        network: "mainnet",
        signatures: [],
        eligible_signers: [],
      },
    ]);
  });

  it("reloads and re-filters requests for the active network", async () => {
    const MultiSigTool = (await import("@/views/Tools/MultiSigTool.vue")).default;
    const wrapper = mount(MultiSigTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
        mocks: {
          $t: (key) => key,
        },
      },
    });

    await flushPromises();
    const state = wrapper.vm.$.setupState;
    await state.loadRequests?.();
    state.loading = false;
    await flushPromises();
    expect(state.requests.map((req) => req.description)).toContain("Mainnet Request");
    expect(state.requests.map((req) => req.description)).not.toContain("Testnet Request");
    expect(state.requests.map((req) => req.description)).not.toContain("Governance Request");

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();
    await state.loadRequests?.();
    await flushPromises();

    expect(getMultisigRequestsMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(state.requests.map((req) => req.description)).not.toContain("Mainnet Request");
    expect(state.requests.map((req) => req.description)).toContain("Testnet Request");
    wrapper.unmount();
  });
});
