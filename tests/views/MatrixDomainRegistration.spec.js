import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    locale: { value: "en" },
  }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const envState = { value: "TestT5" };
const getMatrixDomainProfile = vi.fn();
const invokeContract = vi.fn();
const successToast = vi.fn();
const errorToast = vi.fn();
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
  getActiveBasePath: () => "/rpc/testnet",
  getRpcApiBasePath: () => "/rpc/testnet",
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
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          HashLink: true,
        },
      },
    });

    await wrapper.find('input[type="text"]').setValue("hello");
    const searchButton = wrapper.findAll("button").find((node) => node.text().includes("matrixPage.searchButton"));
    await searchButton.trigger("click");
    await flushPromises();

    const registerButton = wrapper.findAll("button").find((node) => node.text().includes("matrixPage.registerDomain"));
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
    expect(successToast).toHaveBeenCalledWith('nns.toasts.registrationSent:{"txid":"0xtesttxid"}');
  });

  it("wraps long available domains so the register panel stays visible", async () => {
    getMatrixDomainProfile.mockResolvedValueOnce({
      domain: "averyveryveryveryveryveryveryveryverylongdomainname.matrix",
      available: true,
      owner: null,
      admin: null,
      resolvedAddress: null,
    });

    const MatrixDomain = (await import("@/views/NNS/MatrixDomain.vue")).default;
    const wrapper = mount(MatrixDomain, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          HashLink: true,
        },
      },
    });

    await wrapper.find('input[type="text"]').setValue("averyveryveryveryveryveryveryveryverylongdomainname");
    const searchButton = wrapper.findAll("button").find((node) => node.text().includes("matrixPage.searchButton"));
    await searchButton.trigger("click");
    await flushPromises();

    const title = wrapper.find("h3");
    expect(title.exists()).toBe(true);
    expect(title.attributes("class")).toContain("break-all");

    const actionPanel = wrapper.findAll("div").find((node) => node.attributes("class")?.includes("min-w-[240px]"));
    expect(actionPanel).toBeTruthy();
    expect(actionPanel.attributes("class")).toContain("md:self-start");
  });

  it("shows the wallet error description when registration is denied", async () => {
    invokeContract.mockRejectedValueOnce({
      type: "CONNECTION_DENIED",
      description: "The dAPI provider refused to process this request",
      data: null,
    });

    const MatrixDomain = (await import("@/views/NNS/MatrixDomain.vue")).default;
    const wrapper = mount(MatrixDomain, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          HashLink: true,
        },
      },
    });

    await wrapper.find('input[type="text"]').setValue("hello");
    const searchButton = wrapper.findAll("button").find((node) => node.text().includes("matrixPage.searchButton"));
    await searchButton.trigger("click");
    await flushPromises();

    const registerButton = wrapper.findAll("button").find((node) => node.text().includes("matrixPage.registerDomain"));
    await registerButton.trigger("click");
    await flushPromises();

    expect(errorToast).toHaveBeenCalledWith(
      'nns.toasts.registrationFailedWithReason:{"reason":"The dAPI provider refused to process this request"}',
    );
  });
});
