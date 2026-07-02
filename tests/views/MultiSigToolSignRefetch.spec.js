import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

// The board list endpoint returns a summary PROJECTION (no params.unsigned_tx,
// no signature hexes). These tests prove the sign and assemble/broadcast flows
// REFETCH the full record via /api/multisig/requests/[id]
// (supabaseService.getMultisigRequestById) BEFORE any signing-related field is
// read, and never sign from a projected list row.

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

const callOrder = [];
const getMultisigRequestsMock = vi.fn();
const getMultisigRequestByIdMock = vi.fn();
const addMultisigSignatureMock = vi.fn();
const signRawTransactionMock = vi.fn();
const sendRawTransactionMock = vi.fn();
const deserializeMock = vi.fn();
const connectedAccount = ref("APK1");

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getMultisigRequests: getMultisigRequestsMock,
    getMultisigRequestById: (...args) => {
      callOrder.push("refetch-by-id");
      return getMultisigRequestByIdMock(...args);
    },
    createMultisigRequest: vi.fn(),
    addMultisigSignature: addMultisigSignatureMock,
  },
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: {
    isConnected: true,
    signRawTransaction: (...args) => {
      callOrder.push("sign-raw-tx");
      return signRawTransactionMock(...args);
    },
  },
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

// A row exactly as the projected list endpoint returns it: summary fields and
// signer addresses only — no unsigned tx, no signature hexes.
function projectedRow() {
  return {
    id: 5,
    type: "multisig",
    description: "Projected request",
    status: "PENDING",
    network: "mainnet",
    network_mode: "mainnet",
    method: "transfer",
    created_at: "2026-07-01T00:00:00+00:00",
    signers_required: 2,
    eligible_signers: ["APK1", "APK2", "APK3"],
    signatures: [
      { id: 1, signer_address: "APK1" },
      { id: 2, signer_address: "APK2" },
    ],
    params: { hash: "0x123", pubkeys: ["PK1", "PK2", "PK3"] },
  };
}

const FULL_UNSIGNED_TX = "aa".repeat(32);

function fullRow() {
  return {
    ...projectedRow(),
    params: {
      hash: "0x123",
      pubkeys: ["PK1", "PK2", "PK3"],
      unsigned_tx: FULL_UNSIGNED_TX,
    },
    signatures: [
      { id: 1, signer_address: "APK1", signature: "11".repeat(64) },
      { id: 2, signer_address: "APK2", signature: "22".repeat(64) },
    ],
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
      mocks: {
        $t: (key) => key,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe("MultiSigTool sign/broadcast refetch-by-id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;
    connectedAccount.value = "APK1";
    getMultisigRequestsMock.mockResolvedValue([]);
    getMultisigRequestByIdMock.mockResolvedValue(fullRow());
    addMultisigSignatureMock.mockResolvedValue({ success: true, data: [{ id: 1 }] });
    signRawTransactionMock.mockResolvedValue("ab".repeat(64));
    sendRawTransactionMock.mockResolvedValue("0xtxid");
    deserializeMock.mockImplementation(() => ({
      witnesses: [],
      serialize: () => "signed-tx-hex",
    }));

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
        Witness: class {
          constructor(config) {
            Object.assign(this, config);
          }
        },
        Transaction: class {
          static deserialize(hex) {
            callOrder.push("deserialize");
            return deserializeMock(hex);
          }
        },
      },
      rpc: {
        RPCClient: class {
          async sendRawTransaction(hex) {
            callOrder.push("send-raw-tx");
            return sendRawTransactionMock(hex);
          }
        },
      },
      sc: {
        ContractParam: { fromJson: (value) => value },
        createScript: vi.fn(() => "51"),
        ScriptBuilder: class {
          constructor() {
            this.pushed = [];
          }
          emitPush(value) {
            this.pushed.push(value);
            return this;
          }
          build() {
            return "invocation-script";
          }
        },
      },
      u: { HexString: { fromHex: (value) => value } },
    };
  });

  it("openSignModal refetches the full record by id before any signing read", async () => {
    const wrapper = await mountTool();
    const state = wrapper.vm.$.setupState;

    const row = projectedRow();
    expect(row.params.unsigned_tx).toBeUndefined();

    await state.openSignModal(row);
    await flushPromises();

    expect(getMultisigRequestByIdMock).toHaveBeenCalledWith(5, "mainnet");
    // The modal state was hydrated from the per-id response, not the list row.
    expect(state.signModalReq.params.unsigned_tx).toBe(FULL_UNSIGNED_TX);
    expect(state.signModalLoading).toBe(false);
    expect(state.signModalError).toBe("");

    await state.autoSignTx();
    await flushPromises();

    // The wallet signed the REFETCHED unsigned tx, and the refetch strictly
    // preceded the signing read.
    expect(signRawTransactionMock).toHaveBeenCalledWith(FULL_UNSIGNED_TX);
    expect(callOrder.indexOf("refetch-by-id")).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf("refetch-by-id")).toBeLessThan(callOrder.indexOf("sign-raw-tx"));

    wrapper.unmount();
  });

  it("shows an error and refuses to sign when the refetch fails", async () => {
    getMultisigRequestByIdMock.mockResolvedValue(null);
    const wrapper = await mountTool();
    const state = wrapper.vm.$.setupState;

    await state.openSignModal(projectedRow());
    await flushPromises();

    expect(state.signModalLoading).toBe(false);
    expect(state.signModalError).toBeTruthy();

    await state.autoSignTx();
    await flushPromises();
    expect(signRawTransactionMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("handleBroadcast assembles from the refetched record, never from the projected row", async () => {
    const wrapper = await mountTool();
    const state = wrapper.vm.$.setupState;

    const row = projectedRow();
    await state.handleBroadcast(row);
    await flushPromises();

    expect(getMultisigRequestByIdMock).toHaveBeenCalledWith(5, "mainnet");
    // The unsigned tx deserialized for assembly came from the per-id response.
    expect(deserializeMock).toHaveBeenCalledWith(FULL_UNSIGNED_TX);
    expect(sendRawTransactionMock).toHaveBeenCalledWith("signed-tx-hex");
    expect(callOrder.indexOf("refetch-by-id")).toBeLessThan(callOrder.indexOf("deserialize"));
    expect(callOrder.indexOf("deserialize")).toBeLessThan(callOrder.indexOf("send-raw-tx"));
    // The board row is marked executed locally after a successful broadcast.
    expect(row.status).toBe("EXECUTED");
    expect(row.tx_hash).toBe("0xtxid");

    wrapper.unmount();
  });

  it("handleBroadcast aborts without assembling when the refetch fails", async () => {
    getMultisigRequestByIdMock.mockResolvedValue(null);
    const wrapper = await mountTool();
    const state = wrapper.vm.$.setupState;

    await state.handleBroadcast(projectedRow());
    await flushPromises();

    expect(deserializeMock).not.toHaveBeenCalled();
    expect(sendRawTransactionMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
