import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key, pluralOrParams, params) => {
      const count =
        typeof pluralOrParams === "number"
          ? pluralOrParams
          : params && typeof params.count !== "undefined"
            ? params.count
            : undefined;
      if (typeof count !== "undefined") {
        return `${key}:${count}`;
      }
      if (params && typeof params.count !== "undefined") {
        return `${key}:${params.count}`;
      }
      return key;
    },
  }),
}));

const envState = { value: "Mainnet" };
const getMultisigRequestsMock = vi.fn();
const getValidatorMetadataMock = vi.fn();
const createMultisigRequestMock = vi.fn();
const addMultisigSignatureMock = vi.fn();
const getMultisigRequestByIdMock = vi.fn();
const connectedAccount = ref("");
const getCommitteeMock = vi.fn();
const getVersionMock = vi.fn();
const invokeScriptMock = vi.fn();
const calculateNetworkFeeMock = vi.fn();
const createMultiSigMock = vi.fn(() => ({ address: "NGOV", scriptHash: "0xabc", contract: { script: "script" } }));
const walletServiceMock = {
  isConnected: false,
  signRawTransaction: vi.fn(),
  getRawTransactionSigningPayload: vi.fn().mockResolvedValue({ payload: "mock", networkMagic: 0, transactionHash: "0x0" }),
  getPublicKey: vi.fn().mockResolvedValue(""),
  account: null,
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
  getActiveBasePath: () => "/rpc/mainnet",
  getRpcApiBasePath: () => "/rpc/mainnet",
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
  isOffchainReviewPacket: (request) => Boolean(request?.metadata?.offchain_packet_only),
  getStoredSignatureCount: (request) => {
    const explicitCount = Array.isArray(request?.signatures) ? request.signatures.length : 0;
    if (explicitCount > 0) return explicitCount;
    const metadataCount = Number(request?.metadata?.signatures_collected || 0);
    return Number.isFinite(metadataCount) && metadataCount > 0 ? metadataCount : 0;
  },
  getRequiredSignatureCount: (request) => {
    const explicitCount = Number(request?.signers_required || 0);
    if (Number.isFinite(explicitCount) && explicitCount > 0) return explicitCount;
    const metadataCount = Number(request?.metadata?.signatures_needed || 0);
    return Number.isFinite(metadataCount) && metadataCount > 0 ? metadataCount : 0;
  },
  resolveCommitteePubkeys: (request, liveCommitteePubkeys = []) => {
    const isOfficial = String(request?.params?.governance_mode || "").trim().toLowerCase() === "official";
    if (isOfficial && Array.isArray(liveCommitteePubkeys) && liveCommitteePubkeys.length > 0) {
      return liveCommitteePubkeys;
    }
    if (Array.isArray(request?.params?.committee_pubkeys) && request.params.committee_pubkeys.length > 0) {
      return request.params.committee_pubkeys;
    }
    if (Array.isArray(request?.params?.committee) && request.params.committee.length > 0) {
      return request.params.committee;
    }
    if (Array.isArray(request?.params?.pubkeys) && request.params.pubkeys.length > 0) {
      return request.params.pubkeys;
    }
    return [];
  },
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

vi.mock("@cityofzion/neon-js", () => {
  const runtime = () => globalThis.window?.Neon || {};
  return {
    get default() {
      return runtime();
    },
    get wallet() {
      return runtime().wallet;
    },
    get tx() {
      return runtime().tx;
    },
    get rpc() {
      return runtime().rpc;
    },
    get sc() {
      return runtime().sc;
    },
    get u() {
      return runtime().u;
    },
  };
});

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
          static createMultiSig(...args) {
            return createMultiSigMock(...args);
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
          async getVersion() {
            return getVersionMock();
          }
          async invokeScript(script, signers) {
            return invokeScriptMock(script, signers);
          }
          async calculateNetworkFee(tx) {
            return calculateNetworkFeeMock(tx);
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
    getVersionMock.mockResolvedValue({ protocol: { maxvaliduntilblockincrement: 5760, msperblock: 3000 } });
    invokeScriptMock.mockResolvedValue({ state: "HALT", gasconsumed: "135208" });
    calculateNetworkFeeMock.mockResolvedValue("721066");
    createMultiSigMock.mockClear();
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

  afterEach(() => {
    delete window.Neon;
  });

  it("reloads committee state and proposal list for the active network", async () => {
    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();
    expect(wrapper.html()).toContain("Mainnet Proposal");
    expect(wrapper.text()).toContain("tools.governance.publicOversight");
    expect(wrapper.text()).toContain("tools.governance.committeeSnapshot");
    expect(wrapper.text()).toContain("tools.governance.proposalQueue");
    expect(wrapper.text()).toContain("tools.governance.headerSubtitle");
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

  it("renders the proposal queue without requiring global $tc injection", async () => {
    envState.value = "TestT5";
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 31,
        type: "governance",
        description: "Runtime list proposal",
        network: "testnet",
        method: "setGasPerBlock",
        signers_required: 2,
        signatures: [],
        eligible_signers: ["APK1", "APK2"],
        params: {
          hash: "0x1234",
        },
      },
    ]);

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.html()).toContain("Runtime list proposal");
    expect(wrapper.html()).toContain("tools.governance.callCount:1");
    wrapper.unmount();
  });

  it("uses the registered governance proposal detail route name in proposal cards", async () => {
    const GovernanceProposalList = (await import("@/views/Tools/components/GovernanceProposalList.vue")).default;
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/tools/governance", name: "governanceTool", component: { template: "<div />" } },
        { path: "/tools/governance/:id", name: "governanceProposalDetail", component: { template: "<div />" } },
      ],
    });

    await router.push("/tools/governance");
    await router.isReady();

    const wrapper = mount(GovernanceProposalList, {
      props: {
        requests: [
          {
            id: "route-test",
            type: "governance",
            description: "Route test proposal",
            network: "testnet",
            method: "setGasPerBlock",
            signers_required: 2,
            signatures: [],
            eligible_signers: ["APK1", "APK2"],
            params: { hash: "0x1234" },
            status: "PENDING",
          },
        ],
        loading: false,
        connectedAccount: "",
        threshold: 2,
        councilIdentityMap: {},
        canCreateProposal: false,
        isCouncilNode: false,
        committeePubkeys: [],
      },
      global: {
        plugins: [router],
        mocks: {
          $t: (key) => key,
        },
        stubs: {
          Skeleton: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.html()).toContain("/tools/governance/route-test");
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
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
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

  it("does not count off-chain review packets as ready to broadcast", async () => {
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 44,
        type: "governance",
        description: "Off-chain review packet",
        network: "mainnet",
        status: "PENDING",
        signatures: [],
        signers_required: 11,
        eligible_signers: [],
        metadata: {
          offchain_packet_only: true,
          signatures_collected: 11,
          signatures_needed: 11,
        },
      },
    ]);

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Off-chain review packet");
    expect(wrapper.text()).toContain("0 tools.governance.ready");
    expect(wrapper.text()).not.toContain("tools.governance.broadcastTx");
    wrapper.unmount();
  });

  it("lets a council signer create and persist a governance proposal", async () => {
    connectedAccount.value = "APK1";
    walletServiceMock.isConnected = true;
    getMultisigRequestsMock.mockResolvedValue([]);

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const newProposalButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.newProposal"));
    await newProposalButton.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("tools.governance.proposalDescription");

    const textInputs = wrapper.findAll("input");
    await textInputs[0].setValue("Adjust GAS emissions");
    await textInputs[1].setValue("100000000");

    const createButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.createProposal"));
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

  it("stores governance proposals as unsigned transaction packets and preserves the official committee signer", async () => {
    connectedAccount.value = "APK1";
    walletServiceMock.isConnected = true;
    getMultisigRequestsMock.mockResolvedValue([]);

    const serializeMock = vi.fn((includeWitnesses) => (includeWitnesses ? "signed-tx-should-not-be-used" : "unsigned-packet-hex"));
    const hashMock = vi.fn(() => "0xunsigned-hash");
    const originalTransaction = window.Neon.tx.Transaction;
    const originalCreateMultiSig = createMultiSigMock.getMockImplementation();

    createMultiSigMock.mockImplementation(() => ({
      address: "NU6wVcRy9mb81YxZcxrpBudVn7d4MTDqEz",
      scriptHash: "fb67b21b230ccacd20183446fd3fad96582bd459",
      contract: { script: "script" },
    }));

    window.Neon.tx.Transaction = class {
      constructor(config) {
        Object.assign(this, config);
      }
      serialize(includeWitnesses) {
        return serializeMock(includeWitnesses);
      }
      hash() {
        return hashMock();
      }
    };

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const newProposalButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.newProposal"));
    await newProposalButton.trigger("click");
    await flushPromises();

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

    const createState = findCreateFormInTree(wrapper.vm.$);
    createState.createForm.description = "Unsigned council packet";
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

    await createState.handleCreateProposal();
    await flushPromises();

    expect(createMultisigRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible_signers: ["APK1", "APK2", "APK3", "APK4"],
        params: expect.objectContaining({
          unsigned_tx: expect.any(String),
          hash: expect.any(String),
          scriptHash: "fb67b21b230ccacd20183446fd3fad96582bd459",
          valid_until_block: 5883,
          committee_pubkeys: ["PK1", "PK2", "PK3", "PK4"],
          governance_mode: "official",
        }),
      }),
    );

    window.Neon.tx.Transaction = originalTransaction;
    createMultiSigMock.mockImplementation(originalCreateMultiSig);
    wrapper.unmount();
  });

  it("preserves raw committee ordering for official governance packets", async () => {
    connectedAccount.value = "APK3";
    walletServiceMock.isConnected = true;
    getCommitteeMock.mockResolvedValue(["PK3", "PK1", "PK2"]);
    getMultisigRequestsMock.mockResolvedValue([]);

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const newProposalButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.newProposal"));
    await newProposalButton.trigger("click");
    await flushPromises();

    const textInputs = wrapper.findAll("input");
    await textInputs[0].setValue("Official ordering proposal");
    await textInputs[1].setValue("1000");

    const createButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.createProposal"));
    await createButton.trigger("click");
    await flushPromises();

    expect(createMultiSigMock).toHaveBeenCalledWith(2, ["PK3", "PK1", "PK2"]);
    expect(createMultisigRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eligible_signers: ["APK3", "APK1", "APK2"],
        params: expect.objectContaining({
          committee_pubkeys: ["PK3", "PK1", "PK2"],
        }),
      }),
    );
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
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const newProposalButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.newProposal"));
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

  it("forks a proposal into a refreshed draft and preserves the original signer context", async () => {
    connectedAccount.value = "AFORKER";
    walletServiceMock.isConnected = true;
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 77,
        type: "governance",
        description: "Reduce block time and GAS reward",
        method: "setMillisecondsPerBlock,setGasPerBlock",
        target_contract: "MULTI_CALL",
        network: "mainnet",
        signatures: [{ signer_address: "APK1" }],
        signers_required: 11,
        eligible_signers: ["APK1", "APK2", "APK3"],
        status: "PENDING",
        params: {
          unsigned_tx: "001122",
          hash: "0xdeadbeef",
          scriptHash: "0xcommittee",
          valid_until_block: 9055023,
          governance_mode: "official",
          committee_pubkeys: ["PK1", "PK2", "PK3"],
          invocations: [
            {
              selectedContract: "PolicyContract",
              selectedMethod: "setMillisecondsPerBlock",
              params: { value: "3000" },
              targetHash: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
            },
            {
              selectedContract: "NEO",
              selectedMethod: "setGasPerBlock",
              params: { gasPerBlock: "100000000" },
              targetHash: "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
            },
          ],
        },
      },
    ]);

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const forkButton = wrapper.find('[data-testid="governance-list-fork-77"]');
    expect(forkButton.exists()).toBe(true);
    await forkButton.trigger("click");
    await flushPromises();

    let createState;
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
    createState = findCreateFormInTree(wrapper.vm.$);
    expect(createState.sourceProposalId).toBe("77");

    createState.createForm.description = "Reduce block time and GAS reward [Refreshed]";
    await createState.handleCreateProposal();
    await flushPromises();

    expect(createMultisigRequestMock).toHaveBeenCalledTimes(1);
    expect(createMultisigRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        creator_address: "AFORKER",
        description: "Reduce block time and GAS reward [Refreshed]",
        signers_required: 11,
        eligible_signers: ["APK1", "APK2", "APK3"],
        params: expect.objectContaining({
          forked_from_proposal_id: 77,
          previous_valid_until_block: 9055023,
          refreshed_valid_until_block: 5883,
          scriptHash: "0xcommittee",
          committee_pubkeys: ["PK1", "PK2", "PK3"],
          governance_mode: "official",
        }),
      }),
    );

    wrapper.unmount();
  });

  it("clones the source unsigned transaction for an unchanged official fork and only refreshes validUntilBlock", async () => {
    envState.value = "TestT5";
    connectedAccount.value = "AFORKER";
    walletServiceMock.isConnected = true;
    invokeScriptMock.mockClear();
    calculateNetworkFeeMock.mockClear();
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 99,
        type: "governance",
        description: "Refresh-only official proposal",
        method: "setFeePerByte",
        target_contract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
        network: "testnet",
        signatures: [{ signer_address: "APK1" }],
        signers_required: 11,
        eligible_signers: ["APK1", "APK2", "APK3"],
        status: "PENDING",
        params: {
          unsigned_tx: "001122",
          hash: "0xdeadbeef",
          scriptHash: "0xcommittee",
          valid_until_block: 9055023,
          governance_mode: "official",
          committee_pubkeys: ["PK1", "PK2", "PK3"],
          invocations: [
            {
              selectedContract: "PolicyContract",
              selectedMethod: "setFeePerByte",
              params: { value: "1000" },
              targetHash: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
            },
          ],
        },
      },
    ]);

    let capturedTransactions = [];
    window.Neon.tx.Transaction = class {
      constructor(config) {
        Object.assign(this, config);
      }
      static deserialize() {
        const tx = new this({
          signers: [{ account: "0xcommittee", scopes: 1 }],
          validUntilBlock: 9055023,
          systemFee: "111",
          networkFee: "222",
          script: "51",
        });
        capturedTransactions.push(tx);
        return tx;
      }
      serialize() {
        return "cloned-tx";
      }
      hash() {
        return "0xcloned";
      }
    };

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const forkButton = wrapper.find('[data-testid="governance-list-fork-99"]');
    expect(forkButton.exists()).toBe(true);
    await forkButton.trigger("click");
    await flushPromises();

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

    const createState = findCreateFormInTree(wrapper.vm.$);
    createState.createForm.description = "Refresh-only official proposal [forked]";
    await createState.handleCreateProposal();
    await flushPromises();

    expect(createMultisigRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Refresh-only official proposal [forked]",
        signers_required: 11,
        params: expect.objectContaining({
          unsigned_tx: expect.any(String),
          hash: expect.any(String),
          scriptHash: expect.any(String),
          previous_valid_until_block: 9055023,
          refreshed_valid_until_block: 5883,
          forked_from_proposal_id: 99,
        }),
      }),
    );

    wrapper.unmount();
  });

  it("targets a 30 day valid-until window when the active protocol allows it", async () => {
    connectedAccount.value = "APK1";
    walletServiceMock.isConnected = true;
    getVersionMock.mockResolvedValue({ protocol: { maxvaliduntilblockincrement: 999999, msperblock: 3000 } });
    getMultisigRequestsMock.mockResolvedValue([]);

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();
    const createButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.newProposal"));
    expect(createButton).toBeTruthy();
    await createButton.trigger("click");
    await flushPromises();

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

    const createState = findCreateFormInTree(wrapper.vm.$);
    createState.createForm.description = "Thirty day governance window";
    createState.createForm.invocations[0].params.value = "1000";
    await createState.handleCreateProposal();
    await flushPromises();

    expect(createMultisigRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          valid_until_block: 864123,
        }),
      }),
    );

    wrapper.unmount();
  });

  it("falls back to the live committee signer set when an official fork hits an invalid committee signature fault", async () => {
    envState.value = "TestT5";
    connectedAccount.value = "AFORKER";
    walletServiceMock.isConnected = true;
    invokeScriptMock
      .mockResolvedValueOnce({
        state: "FAULT",
        exception: "Invalid committee signature. It should be a multisig(len(committee) - (len(committee) - 1) / 2)).",
      })
      .mockResolvedValueOnce({ state: "HALT", gasconsumed: "135208" });
    getMultisigRequestsMock.mockResolvedValue([
      {
        id: 88,
        type: "governance",
        description: "Official stale committee proposal",
        method: "setFeePerByte",
        target_contract: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
        network: "testnet",
        signatures: [{ signer_address: "AOLD1" }],
        signers_required: 2,
        eligible_signers: ["AOLD1", "AOLD2"],
        status: "PENDING",
        params: {
          unsigned_tx: "001122",
          hash: "0xdeadbeef",
          scriptHash: "0xoldcommittee",
          valid_until_block: 9055023,
          governance_mode: "official",
          committee_pubkeys: ["OLD1", "OLD2"],
          invocations: [
            {
              selectedContract: "PolicyContract",
              selectedMethod: "setFeePerByte",
              params: { value: "1000" },
              targetHash: "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
            },
          ],
        },
      },
    ]);

    const GovernanceTool = (await import("@/views/Tools/GovernanceTool.vue")).default;
    const wrapper = mount(GovernanceTool, {
      global: {
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const forkButton = wrapper.find('[data-testid="governance-list-fork-88"]');
    expect(forkButton.exists()).toBe(true);
    await forkButton.trigger("click");
    await flushPromises();

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

    const createState = findCreateFormInTree(wrapper.vm.$);
    await createState.handleCreateProposal();
    await flushPromises();

    expect(invokeScriptMock).toHaveBeenCalledTimes(2);
    expect(createMultisigRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        signers_required: 3,
        eligible_signers: ["APK1", "APK2", "APK3", "APK4"],
        params: expect.objectContaining({
          scriptHash: "0xabc",
          committee_pubkeys: ["PK1", "PK2", "PK3", "PK4"],
          governance_mode: "official",
        }),
      }),
    );

    wrapper.unmount();
  });

  it.skip("accepts an external witness script and stores the parsed signature for an eligible signer", async () => {
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
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const addWitnessButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("Add Signature / Witness"));
    await addWitnessButton.trigger("click");
    await flushPromises();

    // Find the GovernanceSignModal child component's setup state
    let signModalState;
    function findSignModalState(instance) {
      if (instance.setupState?.submitExternalWitness) return instance.setupState;
      const children = instance.subTree?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child?.component) {
            const result = findSignModalState(child.component);
            if (result) return result;
          }
        }
      }
      const dynChildren = instance.subTree?.dynamicChildren;
      if (Array.isArray(dynChildren)) {
        for (const child of dynChildren) {
          if (child?.component) {
            const result = findSignModalState(child.component);
            if (result) return result;
          }
        }
      }
      return null;
    }
    signModalState = findSignModalState(wrapper.vm.$);
    signModalState.externalSignerAddress = "APK2";
    signModalState.externalInvocationScript = `0c40${"ab".repeat(64)}`;
    await signModalState.submitExternalWitness();
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

  it.skip("stores public key and invocation script when a connected signer submits a proposal signature", async () => {
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
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const signButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.signProposal"));
    await signButton.trigger("click");
    await flushPromises();

    // Find the GovernanceSignModal child component's setup state
    let signModalState2;
    function findSignModalState2(instance) {
      if (instance.setupState?.submitSig) return instance.setupState;
      const children = instance.subTree?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child?.component) {
            const result = findSignModalState2(child.component);
            if (result) return result;
          }
        }
      }
      const dynChildren = instance.subTree?.dynamicChildren;
      if (Array.isArray(dynChildren)) {
        for (const child of dynChildren) {
          if (child?.component) {
            const result = findSignModalState2(child.component);
            if (result) return result;
          }
        }
      }
      return null;
    }
    signModalState2 = findSignModalState2(wrapper.vm.$);
    await signModalState2.submitSig("ab".repeat(64), "wallet_signature");
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

  it.skip("keeps the add-witness modal scrollable and closable", async () => {
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
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();
    const addWitnessButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("Add Signature / Witness"));
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
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
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
        mocks: {
          $t: (key) => key,
          $tc: (key) => key,
        },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const newProposalButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text().includes("tools.governance.newProposal"));
    await newProposalButton.trigger("click");
    await flushPromises();

    expect(wrapper.html()).toContain("setMillisecondsPerBlock");

    // The create modal content is now inside GovernanceCreateModal child component.
    // Access its internal state through the component's exposed setup state.
    // With script setup, we need to find the component via its rendered DOM.
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

    expect(createMultisigRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "setMillisecondsPerBlock,setGasPerBlock",
        target_contract: "MULTI_CALL",
        params: expect.objectContaining({
          target_contracts: [
            "cc5e4edd9f5f8dba8bb65734541df7a1c081c67b",
            "ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
          ],
          invocations: expect.arrayContaining([
            expect.objectContaining({
              selectedContract: "PolicyContract",
              selectedMethod: "setMillisecondsPerBlock",
            }),
            expect.objectContaining({
              selectedContract: "NEO",
              selectedMethod: "setGasPerBlock",
            }),
          ]),
        }),
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
