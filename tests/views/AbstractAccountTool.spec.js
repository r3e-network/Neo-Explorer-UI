import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const invokeMock = vi.fn();
const simulateInvokeMock = vi.fn();
const broadcastSignedTxMock = vi.fn();
const toastInfoMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

const sharedConnectedAccount = ref("");

vi.mock("@/utils/wallet", () => ({
  connectedAccount: sharedConnectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: {
    isConnected: true,
    account: { address: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu" },
    simulateInvoke: simulateInvokeMock,
    invoke: invokeMock,
    broadcastSignedTx: broadcastSignedTxMock,
  },
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    info: toastInfoMock,
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

describe("AbstractAccountTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedConnectedAccount.value = "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu";
    simulateInvokeMock.mockResolvedValue({ state: "HALT" });
    invokeMock.mockResolvedValue({ txid: "0xtest" });
    broadcastSignedTxMock.mockResolvedValue("0xtest");
  });

  it("uses Global witness scope when deploying abstract account", async () => {
    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(simulateInvokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [{ scope }] = invokeMock.mock.calls[0];
    expect(scope).toBe(128);
  });

  it("sends deploy NEF as base64 ByteArray payload", async () => {
    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(simulateInvokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [{ args }] = invokeMock.mock.calls[0];
    expect(args[0]).toMatchObject({ type: "ByteArray" });
    const magic = Buffer.from(args[0].value, "base64").toString("utf8", 0, 4);
    expect(magic).toBe("NEF3");
  });

  it("omits manager initialization fields when manager list is empty", async () => {
    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(simulateInvokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [{ args }] = invokeMock.mock.calls[0];
    expect(args[2]).toMatchObject({ type: "Array" });
    expect(args[2].value).toHaveLength(2);
  });

  it("serializes admin/manager Hash160 values as plain 40-hex (no 0x prefix)", async () => {
    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    const [adminInput, managerInput] = wrapper.findAll("textarea");
    await adminInput.setValue("NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu");
    await managerInput.setValue("NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu");

    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [{ args }] = invokeMock.mock.calls[0];
    const deployData = args[2];
    const adminHash = deployData.value[0].value[0].value;
    const managerHash = deployData.value[2].value[0].value;
    expect(adminHash).toMatch(/^[0-9a-f]{40}$/);
    expect(managerHash).toMatch(/^[0-9a-f]{40}$/);
  });

  it("prevents deploy when managers are set but signer is not in admin list", async () => {
    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    const [adminInput, managerInput] = wrapper.findAll("textarea");
    await adminInput.setValue("Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf");
    await managerInput.setValue("Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf");

    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(invokeMock).not.toHaveBeenCalled();
    expect(simulateInvokeMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it("stops before wallet invoke when node preflight simulation faults", async () => {
    simulateInvokeMock.mockResolvedValue({
      state: "FAULT",
      exception: "unhandled exception: Unauthorized",
    });

    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(simulateInvokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it("falls back to admin-only deploy when manager init faults under CalledByEntry", async () => {
    simulateInvokeMock
      .mockResolvedValueOnce({ state: "HALT" }) // full deploy under Global
      .mockResolvedValueOnce({ state: "FAULT", exception: "unhandled exception: Unauthorized" }) // wallet-compat check under CBE
      .mockResolvedValueOnce({ state: "HALT" }); // fallback admin-only under Global

    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    const [adminInput, managerInput] = wrapper.findAll("textarea");
    await adminInput.setValue("NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu");
    await managerInput.setValue("NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu");

    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(simulateInvokeMock).toHaveBeenCalledTimes(3);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [{ args }] = invokeMock.mock.calls[0];
    expect(args[2].value).toHaveLength(2);
    expect(toastInfoMock).toHaveBeenCalled();
  });

  it("signs via wallet and broadcasts signed transaction through RPC when signedTx is returned", async () => {
    invokeMock.mockResolvedValueOnce({ signedTx: "signed-raw-tx" });
    broadcastSignedTxMock.mockResolvedValueOnce("0xrpc-broadcast");

    const AbstractAccountTool = (await import("@/views/Tools/AbstractAccountTool.vue")).default;
    const wrapper = mount(AbstractAccountTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    await flushPromises();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(expect.objectContaining({ broadcastOverride: true }));
    expect(broadcastSignedTxMock).toHaveBeenCalledWith("signed-raw-tx");
    expect(toastSuccessMock).toHaveBeenCalled();
  });
});
