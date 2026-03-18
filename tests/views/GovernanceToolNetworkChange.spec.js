import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const envState = { value: "Mainnet" };
const getMultisigRequestsMock = vi.fn();
const getValidatorMetadataMock = vi.fn();
const createMultisigRequestMock = vi.fn();
const connectedAccount = ref("");
const getCommitteeMock = vi.fn();
const walletServiceMock = {
  isConnected: false,
  signRawTransaction: vi.fn(),
};

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getMultisigRequests: getMultisigRequestsMock,
    getValidatorMetadata: getValidatorMetadataMock,
    createMultisigRequest: createMultisigRequestMock,
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

vi.mock("@/utils/env", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getRpcClientUrl: () => "http://rpc.test",
  getCurrentEnv: () => envState.value,
  getActiveBasePath: () => "/api/mainnet",
  getRpcApiBasePath: () => "/api/mainnet",
  setActiveBasePath: vi.fn(),
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
            if (typeof this.systemFee === "number" || typeof this.networkFee === "number") {
              throw new Error("this.systemFee.toReverseHex is not a function");
            }
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
    getValidatorMetadataMock.mockResolvedValue([
      { address: "APK1", display_name: "Council Alpha", logo_url: "https://example.com/alpha.png" },
      { address: "APK2", display_name: "Council Beta", logo_url: "https://example.com/beta.png" },
    ]);
    getMultisigRequestsMock.mockResolvedValue([
      { id: 1, type: "governance", description: "Mainnet Proposal", network: "mainnet", signatures: [{ signer_address: "APK1" }], eligible_signers: [] },
      { id: 2, type: "governance", description: "Testnet Proposal", network: "testnet", signatures: [], eligible_signers: [] },
      { id: 3, type: "multisig", description: "Wallet Request", network: "mainnet", signatures: [], eligible_signers: [] },
    ]);
    createMultisigRequestMock.mockResolvedValue({ success: true, data: { id: 99 } });
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
    expect(wrapper.html()).toContain("Council Alpha");
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

  it("lets a council signer create and persist a governance proposal", async () => {
    connectedAccount.value = "APK1";
    walletServiceMock.isConnected = true;
    getMultisigRequestsMock.mockResolvedValue([]);

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

    const newProposalButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("New Proposal"));
    await newProposalButton.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Proposal Description");

    const textInputs = wrapper.findAll("input");
    await textInputs[0].setValue("Adjust GAS emissions");
    await textInputs[1].setValue("100000000");

    const createButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Create Proposal"));
    await createButton.trigger("click");
    await flushPromises();

    expect(createMultisigRequestMock).toHaveBeenCalledTimes(1);
    expect(createMultisigRequestMock.mock.calls[0][0]).toMatchObject({
      type: "governance",
      creator_address: "APK1",
      method: "setFeePerByte",
      description: "Adjust GAS emissions",
      signers_required: 3,
      eligible_signers: ["APK1", "APK2", "APK3", "APK4"],
      status: "PENDING",
      network: "mainnet",
    });
    wrapper.unmount();
  });

  it("allows a testnet lab-mode proposal with custom signers and threshold", async () => {
    const labPubkeys = [
      "02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "02cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    ];
    envState.value = "TestT5";
    connectedAccount.value = `A${labPubkeys[0]}`;
    walletServiceMock.isConnected = true;
    getCommitteeMock.mockResolvedValue(["PKX", "PKY", "PKZ"]);
    getMultisigRequestsMock.mockResolvedValue([]);

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
    const setup = wrapper.vm.$.setupState;
    setup.createForm.mode = "lab";
    setup.createForm.description = "Lab test proposal";
    setup.createForm.labThreshold = "2";
    setup.createForm.labSignerPubkeys = labPubkeys.join("\n");
    setup.createForm.invocations[0].params.value = "1000";

    await setup.handleCreateProposal();
    await flushPromises();

    expect(createMultisigRequestMock).toHaveBeenCalledTimes(1);
    const sortedLabPubkeys = [...labPubkeys].sort((a, b) => a.localeCompare(b));
    const sortedLabAddresses = sortedLabPubkeys.map((pubkey) => `A${pubkey}`);
    expect(createMultisigRequestMock.mock.calls[0][0]).toMatchObject({
      type: "governance",
      creator_address: `A${labPubkeys[0]}`,
      method: "setFeePerByte",
      description: "Lab test proposal",
      signers_required: 2,
      eligible_signers: sortedLabAddresses,
      status: "PENDING",
      network: "testnet",
      params: expect.objectContaining({
        lab_mode: true,
        governance_mode: "lab",
        committee_pubkeys: sortedLabPubkeys,
        lab_signer_addresses: sortedLabAddresses,
      }),
    });

    wrapper.unmount();
  });
});
