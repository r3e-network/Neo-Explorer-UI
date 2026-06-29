import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const route = { params: { hash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd" } };
const getByHashWithFallback = vi.fn();
const getManifest = vi.fn();
const getContractMetadata = vi.fn();
const invokeContractFunction = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

vi.mock("@/services/contractService", () => ({
  contractService: {
    getByHashWithFallback,
    getManifest,
  },
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getContractMetadata,
  },
}));

vi.mock("@/utils/contractInvocation", () => ({
  invokeContractFunction,
}));

vi.mock("@/utils/lazyServices", () => ({
  loadWalletService: vi.fn(),
}));

vi.mock("@/composables/useTransactionTracker", () => ({
  useTransactionTracker: () => ({
    txStatuses: {},
    track: vi.fn(),
  }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

describe("ContractDetail auto-read current values", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByHashWithFallback.mockResolvedValue({
      hash: route.params.hash,
      name: "NeoToken",
      updatecounter: 0,
      manifest: {
        name: "NeoToken",
        abi: { methods: [], events: [] },
      },
      nef: { script: "EUA=" },
    });
    getManifest.mockResolvedValue({
      name: "NeoToken",
      abi: {
        methods: [
          { name: "symbol", safe: true, parameters: [], returntype: "String" },
          { name: "balanceOf", safe: true, parameters: [{ name: "account", type: "Hash160" }], returntype: "Integer" },
          { name: "transfer", safe: false, parameters: [], returntype: "Boolean" },
        ],
        events: [],
      },
    });
    getContractMetadata.mockResolvedValue(null);
    invokeContractFunction.mockResolvedValue({
      state: "HALT",
      stack: [{ type: "ByteString", value: btoa("NEO") }],
    });
  });

  it("auto invokes no-argument safe methods and refreshes a single value on demand", async () => {
    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          TabsNav: {
            template: "<div />",
            props: ["modelValue"],
            emits: ["update:modelValue"],
            mounted() {
              this.$emit("update:modelValue", "readContract");
            },
          },
          ScCallTable: true,
          EventsTable: true,
          ContractCodeTab: true,
          ContractWriteTab: true,
          ErrorState: true,
          ContractHeader: true,
          ContractOverviewCard: true,
          ContractReadTab: {
            template: '<button data-test="refresh-symbol" @click="$emit(\'refreshAutoRead\', \'symbol\')">{{ autoReadState.symbol && autoReadState.symbol.result && autoReadState.symbol.result.state }}</button>',
            props: ["readMethods", "readMethodState", "autoReadState", "manifest"],
            emits: ["refreshAutoRead"],
          },
        },
      },
    });

    await flushPromises();

    expect(invokeContractFunction).toHaveBeenCalledTimes(1);
    expect(invokeContractFunction).toHaveBeenCalledWith(route.params.hash, "symbol", [], null, { network: "mainnet" });
    expect(invokeContractFunction).not.toHaveBeenCalledWith(route.params.hash, "balanceOf", expect.anything(), expect.anything(), expect.anything());

    await wrapper.get('[data-test="refresh-symbol"]').trigger("click");
    await flushPromises();

    expect(invokeContractFunction).toHaveBeenCalledTimes(2);
    expect(invokeContractFunction.mock.calls[1]).toEqual([route.params.hash, "symbol", [], null, { network: "mainnet" }]);
  });
});
