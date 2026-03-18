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
    expect(wrapper.text()).toContain("Council approval progress");
    expect(wrapper.text()).toContain("2 more votes needed before broadcast");
    expect(wrapper.text()).toContain("Draft Created");
    expect(wrapper.text()).toContain("Collect Signatures");
    expect(wrapper.text()).toContain("Broadcast Transaction");
    expect(wrapper.find('[data-testid="council-status-panel"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Council Alpha");
    expect(wrapper.text()).toContain("Council Beta");
    expect(wrapper.text()).toContain("Council Node 3");
    expect(wrapper.text()).toContain("Decoded Contract Script");
    expect(wrapper.text()).toContain("Collected Witnesses");
    expect(wrapper.html().indexOf("Decoded Contract Script")).toBeLessThan(wrapper.html().indexOf("Collected Witnesses"));
    expect(wrapper.text()).toContain("Signer Address");
    expect(wrapper.text()).toContain("Stored Signature");
    expect(wrapper.text()).toContain("Parsed Invocation Script");
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
});
