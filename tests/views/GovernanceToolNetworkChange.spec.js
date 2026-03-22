import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const envState = { value: "Mainnet" };
const getMultisigRequestsMock = vi.fn();
const getValidatorMetadataMock = vi.fn();
const createMultisigRequestMock = vi.fn();
const addMultisigSignatureMock = vi.fn();
const getMultisigRequestByIdMock = vi.fn();
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
    addMultisigSignature: addMultisigSignatureMock,
    getMultisigRequestById: getMultisigRequestByIdMock,
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
  toNetworkMode: (value) =>
    String(value || "")
      .toLowerCase()
      .includes("test")
      ? "testnet"
      : "mainnet",
}));

vi.mock("@/utils/governanceRequests", () => ({
  isGovernanceRequest: (request) =>
    String(request?.type || "").toLowerCase() === "governance" ||
    Array.isArray(request?.params?.invocations) ||
    Boolean(request?.params?.governance_mode) ||
    Array.isArray(request?.params?.target_contracts),
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

vi.mock("@/utils/logoOptimization", () => ({
  getDefaultCandidateLogoUrl: (pubkey) => `https://example.com/default-${pubkey}.png`,
  resolveCandidateLogoUrl: (value) => value,
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
        CallFlags: {
          States: 3,
          AllowNotify: 8,
          All: 15,
        },
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
      {
        id: 1,
        type: "governance",
        description: "Mainnet Proposal",
        network: "mainnet",
        signatures: [{ signer_address: "APK1" }],
        eligible_signers: [],
      },
      {
        id: 2,
        type: "governance",
        description: "Testnet Proposal",
        network: "testnet",
        signatures: [],
        eligible_signers: [],
      },
      {
        id: 3,
        type: "multisig",
        description: "Wallet Request",
        network: "mainnet",
        signatures: [],
        eligible_signers: [],
      },
    ]);
    createMultisigRequestMock.mockResolvedValue({ success: true, data: { id: 99 } });
    addMultisigSignatureMock.mockResolvedValue({ success: true, data: [{ id: 1 }] });
    getMultisigRequestByIdMock.mockResolvedValue(null);
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
    expect(wrapper.text()).toContain("Public Oversight");
    expect(wrapper.text()).toContain("Committee Snapshot");
    expect(wrapper.text()).toContain("Proposal Queue");
    expect(wrapper.text()).toContain("Anyone can review council proposals without connecting a wallet");
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

  it("keeps atomic governance proposals visible even when the legacy table has no type column", async () => {
    connectedAccount.value = "";
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 10,
        description: "Atomic mainnet governance",
        network: "mainnet",
        target_contract: "MULTI_CALL",
        method: "setMillisecondsPerBlock,setGasPerBlock",
        signatures: [],
        eligible_signers: [],
        params: {
          governance_mode: "official",
          target_contracts: ["cc5e4edd9f5f8dba8bb65734541df7a1c081c67b", "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"],
          invocations: [
            {
              selectedContract: "PolicyContract",
              selectedMethod: "setMillisecondsPerBlock",
              targetHash: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
              params: { value: "3000" },
            },
            {
              selectedContract: "NEO",
              selectedMethod: "setGasPerBlock",
              targetHash: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
              params: { gasPerBlock: "100000000" },
            },
          ],
        },
      },
    ]);

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

    expect(wrapper.text()).toContain("Atomic mainnet governance");
    expect(wrapper.text()).toContain("PolicyContract.setMillisecondsPerBlock");
    expect(wrapper.text()).toContain("NEO.setGasPerBlock");
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

    const newProposalButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("New Proposal"));
    await newProposalButton.trigger("click");
    await flushPromises();

    // Find the GovernanceCreateModal child component by walking the vnode tree
    let labCreateState;
    function findCreateFormState(instance) {
      if (instance.setupState?.createForm) return instance.setupState;
      if (instance.subTree?.component?.setupState?.createForm) return instance.subTree.component.setupState;
      const children = instance.subTree?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child?.component) {
            const result = findCreateFormState(child.component);
            if (result) return result;
          }
        }
      }
      const dynChildren = instance.subTree?.dynamicChildren;
      if (Array.isArray(dynChildren)) {
        for (const child of dynChildren) {
          if (child?.component) {
            const result = findCreateFormState(child.component);
            if (result) return result;
          }
        }
      }
      return null;
    }
    labCreateState = findCreateFormState(wrapper.vm.$);
    labCreateState.createForm.mode = "lab";
    labCreateState.createForm.description = "Lab test proposal";
    labCreateState.createForm.labThreshold = "2";
    labCreateState.createForm.labSignerPubkeys = labPubkeys.join("\n");
    labCreateState.createForm.invocations[0].params.value = "1000";

    await labCreateState.handleCreateProposal();
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

  it("accepts an external witness script and stores the parsed signature for an eligible signer", async () => {
    connectedAccount.value = "";
    walletServiceMock.isConnected = false;
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 7,
        type: "governance",
        description: "Mainnet Proposal",
        network: "mainnet",
        signatures: [],
        signers_required: 3,
        eligible_signers: ["APK1", "APK2", "APK3", "APK4"],
        params: {
          unsigned_tx: "001122",
          committee_pubkeys: ["PK1", "PK2", "PK3", "PK4"],
        },
        status: "PENDING",
      },
    ]);
    getMultisigRequestByIdMock.mockResolvedValue({
      id: 7,
      signatures: [{ signer_address: "APK2", signature: "ab".repeat(64) }],
      signers_required: 3,
      params: {
        unsigned_tx: "001122",
        committee_pubkeys: ["PK1", "PK2", "PK3", "PK4"],
      },
    });

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

    const addWitnessButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Add Witness"));
    await addWitnessButton.trigger("click");
    await flushPromises();

    const setup = wrapper.vm.$.setupState;
    setup.externalSignerAddress = "APK2";
    setup.externalInvocationScript = `0c40${"ab".repeat(64)}`;
    await setup.submitExternalWitness();
    await flushPromises();

    expect(addMultisigSignatureMock).toHaveBeenCalledWith(
      7,
      "APK2",
      "ab".repeat(64),
      expect.objectContaining({
        invocationScript: `0c40${"ab".repeat(64)}`,
        witness: expect.objectContaining({
          signer_address: "APK2",
          signature: "ab".repeat(64),
          source: "external_witness",
        }),
      }),
    );

    wrapper.unmount();
  });

  it("stores public key and invocation script when a connected signer submits a proposal signature", async () => {
    connectedAccount.value = "APK2";
    walletServiceMock.isConnected = true;
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 8,
        type: "governance",
        description: "Mainnet Proposal",
        network: "mainnet",
        signatures: [],
        signers_required: 3,
        eligible_signers: ["APK1", "APK2", "APK3", "APK4"],
        params: {
          unsigned_tx: "001122",
          committee_pubkeys: ["PK1", "PK2", "PK3", "PK4"],
        },
        status: "PENDING",
      },
    ]);
    getMultisigRequestByIdMock.mockResolvedValue(null);

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

    const signButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Sign Proposal"));
    await signButton.trigger("click");
    await flushPromises();

    const setup = wrapper.vm.$.setupState;
    await setup.submitSig("ab".repeat(64), "wallet_signature");
    await flushPromises();

    expect(addMultisigSignatureMock).toHaveBeenCalledWith(
      8,
      "APK2",
      "ab".repeat(64),
      expect.objectContaining({
        publicKey: "pk2",
        invocationScript: `0c40${"ab".repeat(64)}`,
        witness: expect.objectContaining({
          signer_address: "APK2",
          signature: "ab".repeat(64),
          public_key: "pk2",
          invocation_script: `0c40${"ab".repeat(64)}`,
          source: "wallet_signature",
        }),
      }),
    );

    wrapper.unmount();
  });

  it("keeps the add-witness modal scrollable and closable", async () => {
    connectedAccount.value = "";
    walletServiceMock.isConnected = false;
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 12,
        type: "governance",
        description: "Modal Proposal",
        network: "mainnet",
        signatures: [],
        signers_required: 3,
        eligible_signers: ["APK1", "APK2", "APK3", "APK4"],
        params: {
          unsigned_tx: "001122",
          committee_pubkeys: ["PK1", "PK2", "PK3", "PK4"],
        },
        status: "PENDING",
      },
    ]);

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
    const addWitnessButton = wrapper.findAll("button").find((candidate) => candidate.text().includes("Add Witness"));
    await addWitnessButton.trigger("click");
    await flushPromises();

    const overlay = wrapper.get('[data-testid="governance-sign-modal-overlay"]');
    const panel = wrapper.get('[data-testid="governance-sign-modal-panel"]');
    const body = wrapper.get('[data-testid="governance-sign-modal-body"]');

    expect(panel.classes()).toContain("max-h-[90vh]");
    expect(body.classes()).toContain("overflow-y-auto");

    await overlay.trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="governance-sign-modal-overlay"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("falls back from a broken signer logo to the committee pubkey logo in the governance list", async () => {
    connectedAccount.value = "";
    getValidatorMetadataMock.mockResolvedValue([
      { address: "APK1", display_name: "Council Alpha", logo_url: "https://example.com/broken-alpha.png" },
    ]);
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 11,
        type: "governance",
        description: "Mainnet Proposal",
        network: "mainnet",
        signatures: [{ id: 1, signer_address: "APK1" }],
        eligible_signers: [],
      },
    ]);

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

    const logo = wrapper.get("img.h-5.w-5");
    expect(logo.attributes("src")).toBe("https://example.com/broken-alpha.png");

    await logo.trigger("error");

    expect(logo.attributes("src")).toBe("https://example.com/default-PK1.png");
    wrapper.unmount();
  });

  it("guides the atomic block-time plus gas proposal and emits exact invocation call flags", async () => {
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

    expect(wrapper.html()).toContain("setMillisecondsPerBlock");

    // The create modal content is now inside GovernanceCreateModal child component.
    // Access its internal state through the component's exposed setup state.
    // With script setup, we need to find the component via its rendered DOM.
    const createModalWrapper = wrapper.findComponent({ ref: undefined });
    // Walk the internal vnode tree to find the GovernanceCreateModal component instance
    let createState;
    const rootInstance = wrapper.vm.$;
    function findCreateFormInTree(instance) {
      if (instance.setupState?.createForm) return instance.setupState;
      if (instance.subTree?.component?.setupState?.createForm) return instance.subTree.component.setupState;
      const children = instance.subTree?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child?.component) {
            const result = findCreateFormInTree(child.component);
            if (result) return result;
          }
        }
      }
      // Also check dynamicChildren
      const dynChildren = instance.subTree?.dynamicChildren;
      if (Array.isArray(dynChildren)) {
        for (const child of dynChildren) {
          if (child?.component) {
            const result = findCreateFormInTree(child.component);
            if (result) return result;
          }
        }
      }
      return null;
    }
    createState = findCreateFormInTree(rootInstance);
    createState.createForm.description = "Reduce block time and GAS reward";
    createState.createForm.invocations = [
      {
        selectedContract: "PolicyContract",
        selectedMethod: "setMillisecondsPerBlock",
        params: { value: "3000" },
      },
      {
        selectedContract: "NEO",
        selectedMethod: "setGasPerBlock",
        params: { gasPerBlock: "100000000" },
      },
    ];
    await flushPromises();

    expect(wrapper.text()).toContain("Block generation time in milliseconds");
    expect(wrapper.text()).toContain("Example: 3000");
    expect(wrapper.text()).toContain("1 GAS = 100000000");
    expect(wrapper.findAll("input").some((input) => input.attributes("placeholder") === "e.g. 3000")).toBe(true);

    await createState.handleCreateProposal();
    await flushPromises();

    expect(window.Neon.sc.createScript).toHaveBeenCalledWith(
      expect.objectContaining({
        scriptHash: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
        operation: "setMillisecondsPerBlock",
        args: ["3000"],
        callFlags: 11,
      }),
      expect.objectContaining({
        scriptHash: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
        operation: "setGasPerBlock",
        args: ["100000000"],
        callFlags: 3,
      }),
    );

    expect(createMultisigRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "setMillisecondsPerBlock,setGasPerBlock",
        target_contract: "MULTI_CALL",
        params: expect.objectContaining({
          target_contracts: ["cc5e4edd9f5f8dba8bb65734541df7a1c081c67b", "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"],
        }),
      }),
    );

    wrapper.unmount();
  });
});
