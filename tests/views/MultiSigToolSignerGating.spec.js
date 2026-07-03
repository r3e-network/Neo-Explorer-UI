import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

// Audit finding #2: the create POST persists params.pubkeys/params.hash but
// silently drops the top-level eligible_signers / target_contract columns the
// board template gates on. A UI-created request therefore came back with no
// eligible_signers (Sign button never rendered) and a blank target cell.
//
// The fix derives both from the params blob that DOES survive the projection,
// mirroring GovernanceProposalDetail. These tests prove a projected row that
// carries ONLY params.pubkeys/params.hash still renders a usable Sign button
// for a connected eligible signer and a non-empty target.

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

const getMultisigRequestsMock = vi.fn();
const connectedAccount = ref("APK1");

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getMultisigRequests: getMultisigRequestsMock,
    getMultisigRequestById: vi.fn(),
    createMultisigRequest: vi.fn(),
    addMultisigSignature: vi.fn(),
  },
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: { isConnected: true, signRawTransaction: vi.fn() },
}));

vi.mock("@/utils/env", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRpcClientUrl: () => "http://rpc.test",
    getCurrentEnv: () => "Mainnet",
    NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  };
});

vi.mock("@/utils/rpcEndpoints", () => ({
  toNetworkMode: (value) =>
    String(value || "")
      .toLowerCase()
      .includes("test")
      ? "testnet"
      : "mainnet",
}));

vi.mock("@/utils/governanceRequests", () => ({
  isGovernanceRequest: () => false,
  matchesRequestNetwork: () => true,
}));

// A row exactly as the projected list endpoint returns it AFTER a UI create:
// params.pubkeys survives the projection, but the top-level eligible_signers
// and target_contract were dropped by the insert whitelist.
function uiCreatedProjectedRow() {
  return {
    id: 9,
    type: "multisig",
    description: "UI-created request",
    status: "PENDING",
    network: "mainnet",
    network_mode: "mainnet",
    method: "transfer",
    created_at: "2026-07-01T00:00:00+00:00",
    signers_required: 2,
    // NOTE: no eligible_signers, no target_contract — the bug this fix repairs.
    signatures: [],
    params: {
      hash: "0x123",
      scriptHash: "0xmultisig",
      pubkeys: ["PK1", "PK2", "PK3"],
      target_contract: "abcdef0123",
    },
  };
}

async function mountTool() {
  const MultiSigTool = (await import("@/views/Tools/MultiSigTool.vue")).default;
  const wrapper = mount(MultiSigTool, {
    global: {
      stubs: {
        Breadcrumb: true,
        Skeleton: true,
        CopyButton: true,
        UnsignedTransactionViewer: true,
        RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
      },
      mocks: { $t: (key) => key },
    },
  });
  await flushPromises();
  return wrapper;
}

describe("MultiSigTool params-derived Sign gating (finding #2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectedAccount.value = "APK1";
    getMultisigRequestsMock.mockResolvedValue([uiCreatedProjectedRow()]);
    // The Account mock derives address = "A" + pubkey, so PK1 -> APK1.
    window.Neon = {
      wallet: {
        Account: class {
          constructor(value) {
            this.address = `A${value}`;
            this.scriptHash = "0xabc";
          }
          static createMultiSig() {
            return { address: "NMULTI", scriptHash: "0xabc", contract: { script: "vscript" } };
          }
        },
      },
      tx: {
        WitnessScope: { Global: 1 },
        // findNeonJs (src/utils/neonLoader.js) requires tx.Transaction.deserialize
        // + rpc.RPCClient before it accepts window.Neon; without it the loader
        // falls back to importing the real bundled neon-js and the mock Account
        // (address = "A" + pubkey) is never used.
        Transaction: class {
          static deserialize() {
            return new (class {})();
          }
        },
      },
      rpc: { RPCClient: class {} },
      sc: { ContractParam: { fromJson: (v) => v }, createScript: vi.fn(() => "51") },
      u: { HexString: { fromHex: (v) => v } },
    };
  });

  it("derives eligible_signers from params.pubkeys so the row hydrates a signer set", async () => {
    const wrapper = await mountTool();
    const req = wrapper.vm.$.setupState.requests[0];

    // eligible_signers was absent on the wire; it is derived from params.pubkeys.
    expect(req.eligible_signers).toEqual(["APK1", "APK2", "APK3"]);
    // target_contract was absent on the wire; it falls back to params.target_contract.
    expect(req.target_contract).toBe("abcdef0123");

    wrapper.unmount();
  });

  it("renders a Sign button for a connected eligible signer on a params-only row", async () => {
    const wrapper = await mountTool();
    await flushPromises();

    const signButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("tools.multisig.signPayload"));
    expect(signButton).toBeTruthy();

    wrapper.unmount();
  });

  it("does not render a Sign button when the connected account is not a derived signer", async () => {
    connectedAccount.value = "Nobody";
    const wrapper = await mountTool();
    await flushPromises();

    const signButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("tools.multisig.signPayload"));
    expect(signButton).toBeFalsy();

    wrapper.unmount();
  });

  it("keeps a real persisted eligible_signers array when present (derivation is fallback only)", async () => {
    getMultisigRequestsMock.mockResolvedValue([
      { ...uiCreatedProjectedRow(), eligible_signers: ["Nexplicit"] },
    ]);
    const wrapper = await mountTool();
    const req = wrapper.vm.$.setupState.requests[0];

    expect(req.eligible_signers).toEqual(["Nexplicit"]);

    wrapper.unmount();
  });
});
