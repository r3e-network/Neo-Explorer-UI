import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = { value: "TestT5" };
const getMatrixDomainProfile = vi.fn();
const invokeContract = vi.fn();
const successToast = vi.fn();
const errorToast = vi.fn();
const getScriptHashFromAddress = vi.fn(() => "13ef519c362973f9a34648a9eac5b71250b2a80a");

vi.mock("vue-toastification", () => ({
  useToast: () => ({
    error: errorToast,
    info: vi.fn(),
    success: successToast,
  }),
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => envState.value,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  NET_ENV: {
    Mainnet: "Mainnet",
    TestT5: "TestT5",
  },
  getActiveBasePath: () => "/api/testnet",
  getRpcApiBasePath: () => "/api/testnet",
  setActiveBasePath: vi.fn(),
  getConfiguredRpcBaseUrl: () => "",
  toAbsoluteUrl: (value) => value,
}));

vi.mock("@/services/nnsService", () => ({
  default: {
    getMatrixDomainProfile,
  },
}));

vi.mock("@/utils/wallet", () => ({
  connectedAccount: { value: "NLtL2v28d7TyMEaXcPqtekunkFRksJ7wxu" },
  invokeContract,
}));

vi.mock("@cityofzion/neon-js", () => ({
  sc: {
    ContractParam: {
      string: vi.fn((value) => ({ type: "String", value })),
      hash160: vi.fn((value) => ({ type: "Hash160", value })),
      byteArray: vi.fn((value) => ({ type: "ByteArray", value })),
      any: vi.fn(() => ({ type: "Any", value: null })),
    },
  },
  wallet: {
    getScriptHashFromAddress,
  },
}));

describe("MatrixDomain registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.value = "TestT5";
    getMatrixDomainProfile.mockResolvedValue({
      domain: "hello.matrix",
      available: true,
      owner: null,
      admin: null,
      resolvedAddress: null,
    });
    invokeContract.mockResolvedValue("0xtesttxid");
  });

  it("registers an available matrix domain with the connected wallet", async () => {
    const MatrixDomain = (await import("@/views/NNS/MatrixDomain.vue")).default;
    const wrapper = mount(MatrixDomain, {
      global: {
        stubs: {
          Breadcrumb: true,
          HashLink: true,
        },
      },
    });

    await wrapper.find('input[type="text"]').setValue("hello");
    const searchButton = wrapper.findAll("button").find((node) => node.text().includes("Search"));
    await searchButton.trigger("click");
    await flushPromises();

    const registerButton = wrapper.findAll("button").find((node) => node.text().includes("Register Domain"));
    await registerButton.trigger("click");
    await flushPromises();

    expect(invokeContract).toHaveBeenCalledWith(
      "0x89908093c5ccc463e2c5744d6bacb06108b60a75",
      "register",
      [
        { type: "String", value: "hello.matrix" },
        { type: "Hash160", value: "13ef519c362973f9a34648a9eac5b71250b2a80a" },
      ],
      [{ account: "13ef519c362973f9a34648a9eac5b71250b2a80a", scopes: "CalledByEntry" }]
    );
    expect(successToast).toHaveBeenCalledWith("Registration transaction sent: 0xtesttxid");
  });
});
