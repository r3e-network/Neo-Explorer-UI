import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const connectedAccount = ref("");
const getMultisigRequestByIdMock = vi.fn();
const getValidatorMetadataMock = vi.fn();
const addMultisigSignatureMock = vi.fn();
const updateMultisigRequestStatusMock = vi.fn();
const getCommitteeMock = vi.fn();
const toast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getMultisigRequestById: getMultisigRequestByIdMock,
    getValidatorMetadata: getValidatorMetadataMock,
    addMultisigSignature: addMultisigSignatureMock,
    updateMultisigRequestStatus: updateMultisigRequestStatusMock,
  },
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: {
    isConnected: true,
    signRawTransaction: vi.fn(),
  },
}));

vi.mock("@/components/trace/ScriptViewer.vue", () => ({
  default: { name: "ScriptViewer", props: ["label"], template: "<div>{{ label }}</div>" },
}));

vi.mock("@/utils/logoOptimization", () => ({
  getDefaultCandidateLogoUrl: (pubkey) => `https://example.com/default-${pubkey}.png`,
  resolveCandidateLogoUrl: (value) => value,
}));

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "1" } }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/utils/env", () => ({
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getRpcClientUrl: () => "http://rpc.test",
  getCurrentEnv: () => "Mainnet",
}));

describe("GovernanceProposalDetail", () => {
  const unsignedTx =
    "007e5263f000e1f505000000000065cd1d00000000ad84dd0001aa72bef4c00356e5a63303e3f475789b1ef1f87b80003001e80311c01f0c0d736574466565506572427974650c147bc681c0a1f71d543457b68bba8d5f9fdd4e5ecc41627d5b52";

  beforeEach(() => {
    vi.clearAllMocks();
    connectedAccount.value = "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
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
      sc: { ScriptBuilder: class {}, ContractParam: { fromJson: (value) => value } },
      u: { HexString: { fromHex: (value) => value } },
    };
    getCommitteeMock.mockResolvedValue([
      "02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "02cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "03dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    ]);
    getValidatorMetadataMock.mockResolvedValue([
      {
        address: "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        display_name: "Council Alpha",
        logo_url: "https://example.com/alpha.png",
      },
      {
        address: "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        display_name: "Council Beta",
        logo_url: "https://example.com/beta.png",
      },
    ]);
  });

  it("shows proposal details, signer progress, and council vote list", async () => {
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      type: "governance",
      method: "setGasPerBlock",
      description: "Adjust GAS emissions",
      target_contract: "0xef4073",
      status: "PENDING",
      signers_required: 3,
      eligible_signers: [
        "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "A02cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "A03dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      ],
      signatures: [{
        id: 9,
        signer_address: "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        signature: "ab".repeat(64),
      }],
      params: {
        unsigned_tx: unsignedTx,
        hash: "0xdeadbeef",
        broadcast_witness: {
          invocationScript: "0c40deadbeef",
          verificationScript: "2102feedfaceac",
        },
      },
      created_at: "2026-03-15T00:00:00.000Z",
    });

    const GovernanceProposalDetail = (await import("@/views/Tools/GovernanceProposalDetail.vue")).default;
    const wrapper = mount(GovernanceProposalDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Adjust GAS emissions");
    expect(wrapper.text()).toContain("setGasPerBlock");
    expect(wrapper.text()).toContain("0xef4073");
    expect(wrapper.text()).toContain("1 / 3");
    expect(wrapper.find('[data-testid="governance-hero"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Council Approval Timeline");
    expect(wrapper.text()).toContain("2 more votes needed before broadcast");
    expect(wrapper.text()).toContain("Draft Created");
    expect(wrapper.text()).toContain("Collect Signatures");
    expect(wrapper.text()).toContain("Broadcast Transaction");
    expect(wrapper.find('[data-testid="council-status-panel"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Council Alpha");
    expect(wrapper.text()).toContain("Council Beta");
    expect(wrapper.text()).toContain("Council Node 3");
    expect(wrapper.text()).toContain("Unsigned Transaction Packet");
    expect(wrapper.text()).toContain("Transaction Envelope");
    expect(wrapper.text()).toContain("Embedded Execution Script");
    expect(wrapper.text()).toContain("Collected Signatures");
    expect(wrapper.html().indexOf("Unsigned Transaction Packet")).toBeLessThan(wrapper.html().indexOf("Collected Signatures"));
    expect(wrapper.text()).toContain("Stored ECDSA Signature");
    expect(wrapper.text()).toContain("Parsed Invocation OpCodes");
    expect(wrapper.findAllComponents({ name: "ScriptViewer" }).length).toBeGreaterThanOrEqual(2);
    expect(wrapper.text()).toContain("Broadcast Witness");
    expect(wrapper.text()).toContain("0c40deadbeef");
    expect(wrapper.text()).toContain("2102feedfaceac");
    expect(wrapper.findAll('[data-testid="signature-witness-card"]').length).toBe(1);
    expect(wrapper.html()).toContain("https://example.com/alpha.png");
    expect(wrapper.html()).toContain("https://example.com/default-02cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.png");
    expect(wrapper.text()).not.toContain("A02cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");
    expect(wrapper.get('[data-testid="signature-witness-logo-A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]').attributes("src")).toBe("https://example.com/alpha.png");
    expect(wrapper.get('[data-testid="council-status-logo-A02cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"]').attributes("src")).toBe("https://example.com/default-02cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.png");
    expect(wrapper.html()).not.toContain("/img/brand/neo.png");
  });

  it("prevents a council member from signing the same proposal twice in the detail page", async () => {
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      type: "governance",
      method: "setGasPerBlock",
      description: "Adjust GAS emissions",
      target_contract: "0xef4073",
      status: "PENDING",
      signers_required: 3,
      eligible_signers: [
        "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "A02cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "A03dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      ],
      signatures: [{
        id: 10,
        signer_address: "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        signature: "ab".repeat(64),
      }],
      params: { unsigned_tx: unsignedTx, hash: "0xdeadbeef" },
      created_at: "2026-03-15T00:00:00.000Z",
    });

    const GovernanceProposalDetail = (await import("@/views/Tools/GovernanceProposalDetail.vue")).default;
    const wrapper = mount(GovernanceProposalDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("You already voted");
    expect(wrapper.text()).not.toContain("Vote / Sign Proposal");
  });

  it("uses the Neo logo only when a council-specific logo cannot be resolved", async () => {
    getValidatorMetadataMock.mockResolvedValueOnce([]);
    getCommitteeMock.mockResolvedValueOnce([]);
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      type: "governance",
      method: "setGasPerBlock",
      description: "Adjust GAS emissions",
      target_contract: "0xef4073",
      status: "PENDING",
      signers_required: 1,
      eligible_signers: ["A05eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"],
      signatures: [],
      params: { unsigned_tx: unsignedTx, hash: "0xdeadbeef" },
      created_at: "2026-03-15T00:00:00.000Z",
    });

    const GovernanceProposalDetail = (await import("@/views/Tools/GovernanceProposalDetail.vue")).default;
    const wrapper = mount(GovernanceProposalDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.html()).toContain("/img/brand/neo.png");
  });

  it("falls back from a broken explicit council logo to the committee pubkey logo before using Neo", async () => {
    getValidatorMetadataMock.mockResolvedValueOnce([
      {
        address: "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        display_name: "Council Alpha",
        logo_url: "https://example.com/broken-alpha.png",
      },
    ]);
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      type: "governance",
      method: "setGasPerBlock",
      description: "Adjust GAS emissions",
      target_contract: "0xef4073",
      status: "PENDING",
      signers_required: 1,
      eligible_signers: ["A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
      signatures: [
        {
          id: 9,
          signer_address: "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signature: "ab".repeat(64),
        },
      ],
      params: { unsigned_tx: unsignedTx, hash: "0xdeadbeef" },
      created_at: "2026-03-15T00:00:00.000Z",
    });

    const GovernanceProposalDetail = (await import("@/views/Tools/GovernanceProposalDetail.vue")).default;
    const wrapper = mount(GovernanceProposalDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    const logo = wrapper.get('[data-testid="signature-witness-logo-A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]');
    expect(logo.attributes("src")).toBe("https://example.com/broken-alpha.png");

    await logo.trigger("error");

    expect(logo.attributes("src")).toBe("https://example.com/default-02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png");
  });

  it("uses proposal committee pubkeys for logo fallback even when live committee loading is unavailable", async () => {
    getValidatorMetadataMock.mockResolvedValueOnce([]);
    getCommitteeMock.mockResolvedValueOnce([]);
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      type: "governance",
      method: "setGasPerBlock",
      description: "Adjust GAS emissions",
      target_contract: "0xef4073",
      status: "PENDING",
      signers_required: 2,
      eligible_signers: [
        "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ],
      signatures: [],
      params: {
        unsigned_tx: unsignedTx,
        hash: "0xdeadbeef",
        committee_pubkeys: [
          "02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        ],
      },
      created_at: "2026-03-15T00:00:00.000Z",
    });

    const GovernanceProposalDetail = (await import("@/views/Tools/GovernanceProposalDetail.vue")).default;
    const wrapper = mount(GovernanceProposalDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="council-status-logo-A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]').attributes("src")).toBe(
      "https://example.com/default-02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png"
    );
    expect(wrapper.get('[data-testid="council-status-logo-A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]').attributes("src")).toBe(
      "https://example.com/default-03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png"
    );
  });

  it("accepts an external witness script for an eligible signer", async () => {
    connectedAccount.value = "";
    addMultisigSignatureMock.mockResolvedValueOnce({ success: true, data: [{ id: 1 }] });
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      type: "governance",
      method: "setGasPerBlock",
      description: "Adjust GAS emissions",
      target_contract: "0xef4073",
      status: "PENDING",
      signers_required: 3,
      eligible_signers: [
        "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ],
      signatures: [],
      params: { unsigned_tx: unsignedTx, hash: "0xdeadbeef" },
      created_at: "2026-03-15T00:00:00.000Z",
    });
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      signatures: [{
        signer_address: "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        signature: "ab".repeat(64),
      }],
      signers_required: 3,
      params: { unsigned_tx: unsignedTx, hash: "0xdeadbeef" },
      status: "PENDING",
    });

    const GovernanceProposalDetail = (await import("@/views/Tools/GovernanceProposalDetail.vue")).default;
    const wrapper = mount(GovernanceProposalDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();
    const setup = wrapper.vm.$.setupState;
    setup.openSignModal();
    setup.externalSignerAddress = "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    setup.externalInvocationScript = `0c40${"ab".repeat(64)}`;
    await setup.submitExternalWitness();
    await flushPromises();

    expect(addMultisigSignatureMock).toHaveBeenCalledWith(
      1,
      "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "ab".repeat(64),
      expect.objectContaining({
        invocationScript: `0c40${"ab".repeat(64)}`,
        witness: expect.objectContaining({
          signer_address: "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signature: "ab".repeat(64),
          source: "external_witness",
        }),
      })
    );
  });

  it("keeps the proposal sign modal scrollable and closable", async () => {
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      type: "governance",
      method: "setGasPerBlock",
      description: "Adjust GAS emissions",
      target_contract: "0xef4073",
      status: "PENDING",
      signers_required: 3,
      eligible_signers: [
        "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ],
      signatures: [],
      params: { unsigned_tx: unsignedTx, hash: "0xdeadbeef" },
      created_at: "2026-03-15T00:00:00.000Z",
    });

    const GovernanceProposalDetail = (await import("@/views/Tools/GovernanceProposalDetail.vue")).default;
    const wrapper = mount(GovernanceProposalDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();
    const setup = wrapper.vm.$.setupState;
    setup.openSignModal();
    await flushPromises();

    const overlay = wrapper.get('[data-testid="governance-detail-sign-modal-overlay"]');
    const panel = wrapper.get('[data-testid="governance-detail-sign-modal-panel"]');
    const body = wrapper.get('[data-testid="governance-detail-sign-modal-body"]');

    expect(panel.classes()).toContain("max-h-[90vh]");
    expect(body.classes()).toContain("overflow-y-auto");

    await overlay.trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="governance-detail-sign-modal-overlay"]').exists()).toBe(false);
  });

  it("renders each invocation from params.invocations for atomic governance packets", async () => {
    getMultisigRequestByIdMock.mockResolvedValueOnce({
      id: 1,
      type: "governance",
      method: "setMillisecondsPerBlock,setGasPerBlock",
      description: "Reduce block time and GAS reward",
      target_contract: "MULTI_CALL",
      status: "PENDING",
      signers_required: 11,
      eligible_signers: [
        "A02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "A03bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ],
      signatures: [],
      params: {
        unsigned_tx: unsignedTx,
        hash: "0xdeadbeef",
        invocations: [
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
        ],
      },
      created_at: "2026-03-15T00:00:00.000Z",
    });

    const GovernanceProposalDetail = (await import("@/views/Tools/GovernanceProposalDetail.vue")).default;
    const wrapper = mount(GovernanceProposalDetail, {
      global: {
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          CopyButton: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Atomic Invocation Plan");
    expect(wrapper.text()).toContain("PolicyContract");
    expect(wrapper.text()).toContain("setMillisecondsPerBlock");
    expect(wrapper.text()).toContain("3000");
    expect(wrapper.text()).toContain("NEO");
    expect(wrapper.text()).toContain("setGasPerBlock");
    expect(wrapper.text()).toContain("100000000");
  });
});
