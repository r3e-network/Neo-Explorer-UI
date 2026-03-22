import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const invokeMock = vi.fn();
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
    invoke: invokeMock,
  },
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    info: toastInfoMock,
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

class MockFileReader {
  readAsArrayBuffer() {
    const nefBytes = new Uint8Array([0x4e, 0x45, 0x46, 0x33, 0x00]).buffer; // "NEF3"
    this.onload?.({ target: { result: nefBytes } });
  }

  readAsText() {
    this.onload?.({ target: { result: JSON.stringify({ name: "DemoContract" }) } });
  }
}

function mockInputFile(inputEl, fileName, mime = "application/octet-stream") {
  const file = new File(["dummy"], fileName, { type: mime });
  Object.defineProperty(inputEl, "files", {
    configurable: true,
    value: [file],
  });
}

function getDeployButton(wrapper) {
  return wrapper.findAll("button").find((b) => b.text().includes("Deploy Contract"));
}

describe("ContractDeployerTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("FileReader", MockFileReader);
    sharedConnectedAccount.value = "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu";
    invokeMock.mockResolvedValue({ txid: "0xtest" });
  });

  it("uses Global witness scope when deploying uploaded contract", async () => {
    const ContractDeployerTool = (await import("@/views/Tools/ContractDeployerTool.vue")).default;
    const wrapper = mount(ContractDeployerTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    const nefInput = wrapper.get('input[accept=".nef"]');
    mockInputFile(nefInput.element, "demo.nef");
    await nefInput.trigger("change");

    const manifestInput = wrapper.get('input[accept=".json"]');
    mockInputFile(manifestInput.element, "manifest.json", "application/json");
    await manifestInput.trigger("change");

    await flushPromises();
    const deployButton = getDeployButton(wrapper);
    expect(deployButton).toBeTruthy();
    await deployButton.trigger("click");
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [{ scope }] = invokeMock.mock.calls[0];
    expect(scope).toBe(128);
  });

  it("sends uploaded NEF as base64 ByteArray payload", async () => {
    const ContractDeployerTool = (await import("@/views/Tools/ContractDeployerTool.vue")).default;
    const wrapper = mount(ContractDeployerTool, {
      global: {
        stubs: {
          Breadcrumb: true,
          RouterLink: true,
        },
      },
    });

    const nefInput = wrapper.get('input[accept=".nef"]');
    mockInputFile(nefInput.element, "demo.nef");
    await nefInput.trigger("change");

    const manifestInput = wrapper.get('input[accept=".json"]');
    mockInputFile(manifestInput.element, "manifest.json", "application/json");
    await manifestInput.trigger("change");

    await flushPromises();
    const deployButton = getDeployButton(wrapper);
    expect(deployButton).toBeTruthy();
    await deployButton.trigger("click");
    await flushPromises();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [{ args }] = invokeMock.mock.calls[0];
    expect(args[0]).toMatchObject({ type: "ByteArray" });
    const magic = Buffer.from(args[0].value, "base64").toString("utf8", 0, 4);
    expect(magic).toBe("NEF3");
  });
});
