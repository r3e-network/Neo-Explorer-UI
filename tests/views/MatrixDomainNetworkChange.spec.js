import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
    locale: { value: "en" },
  }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const envState = { value: "Mainnet" };
const getMatrixDomainProfile = vi.fn();
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
  connectedAccount: { value: null },
  invokeContract: vi.fn(),
}));

describe("MatrixDomain network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.value = "Mainnet";
    getMatrixDomainProfile.mockResolvedValue({ domain: "hello.matrix", available: true });
  });

  it("uses the updated environment when the network changes", async () => {
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

    const input = wrapper.find('input[type="text"]');
    await input.setValue("hello");

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));

    const searchButton = wrapper.findAll('button').find((node) => node.text().includes('Search'));
    await searchButton.trigger("click");
    await flushPromises();

    expect(getMatrixDomainProfile).toHaveBeenCalledWith("hello.matrix");
    expect(wrapper.text()).toContain("Live on Testnet");

    wrapper.unmount();
  });
});
