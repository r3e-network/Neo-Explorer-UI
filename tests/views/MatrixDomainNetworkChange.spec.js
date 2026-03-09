import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = { value: "Mainnet" };
const resolveMatrixDomain = vi.fn();
const safeRpc = vi.fn();
const errorToast = vi.fn();

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    error: errorToast,
    info: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => envState.value,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
}));

vi.mock("@/services/nnsService", () => ({
  default: {
    resolveMatrixDomain,
  },
}));

vi.mock("@/services/api", () => ({
  safeRpc,
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount: { value: null },
  invokeContract: vi.fn(),
}));

vi.mock("@cityofzion/neon-js", () => ({
  sc: { ContractParam: { string: vi.fn(), hash160: vi.fn(), byteArray: vi.fn(), any: vi.fn() } },
  wallet: { getScriptHashFromAddress: vi.fn(() => "0xabc") },
}));

vi.mock("@/utils/neoHelpers", () => ({
  scriptHashHexToAddress: vi.fn((value) => value),
  addressToScriptHash: vi.fn(() => "0xabc"),
  scriptHashToAddress: vi.fn((value) => value),
}));

describe("MatrixDomain network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.value = "Mainnet";
    resolveMatrixDomain.mockResolvedValue(null);
    safeRpc.mockResolvedValue(null);
  });

  it("uses the updated network contract hash after a network switch", async () => {
    const MatrixDomain = (await import("@/views/NNS/MatrixDomain.vue")).default;
    const wrapper = mount(MatrixDomain, {
      global: {
        stubs: {
          Breadcrumb: true,
          HashLink: true,
        },
      },
    });

    const input = wrapper.find('input[type="text"]');
    await input.setValue("hello");

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));

    safeRpc.mockResolvedValueOnce({ result: null });
    safeRpc.mockResolvedValueOnce({ result: null });

    const searchButton = wrapper.findAll('button').find((node) => node.text().includes('Search'));
    await searchButton.trigger("click");
    await flushPromises();

    expect(safeRpc).toHaveBeenCalled();
    const firstContractHash = safeRpc.mock.calls[0][1]?.ContractHash;
    expect(firstContractHash).toBe("0x89908093c5ccc463e2c5744d6bacb06108b60a75");

    wrapper.unmount();
  });
});
