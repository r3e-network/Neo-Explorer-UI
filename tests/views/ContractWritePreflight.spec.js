import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setWalletState } from "@/utils/walletState";

const route = { params: { hash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd" } };
const getByHashWithFallback = vi.fn();
const getManifest = vi.fn();
const getContractMetadata = vi.fn();
const walletInvoke = vi.fn();
const invokeContractFunction = vi.fn();

const walletServiceMock = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  invoke: walletInvoke,
  isConnected: true,
  account: { address: "NNqXaTyKBAbG1SZHYrbycW1HQJjmcdcSMa" },
  provider: "NeoLine",
  getAvailableProviders: vi.fn(() => ["NeoLine"]),
};

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
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

vi.mock("@/utils/lazyServices", () => ({
  loadWalletService: vi.fn(() => Promise.resolve(walletServiceMock)),
}));

vi.mock("@/utils/contractInvocation", () => ({
  invokeContractFunction,
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

function contractFixture() {
  return {
    hash: route.params.hash,
    name: "WriteableContract",
    updatecounter: 0,
    manifest: {
      name: "WriteableContract",
      abi: {
        methods: [
          {
            name: "transfer",
            safe: false,
            parameters: [{ name: "amount", type: "Integer" }],
          },
        ],
        events: [],
      },
    },
  };
}

describe("ContractDetail write preflight simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setWalletState({ connected: true, account: walletServiceMock.account, provider: "NeoLine" });
    getByHashWithFallback.mockResolvedValue(contractFixture());
    getManifest.mockResolvedValue(contractFixture().manifest);
    getContractMetadata.mockResolvedValue(null);
    walletInvoke.mockResolvedValue({ txid: "0xsubmitted" });
  });

  it("blocks wallet invocation and exposes a failure explanation when preflight FAULTs", async () => {
    invokeContractFunction.mockResolvedValueOnce({
      state: "FAULT",
      gasconsumed: "42",
      exception: "CheckWitness failed: signer mismatch",
    });

    const ContractDetail = (await import("@/views/Contract/ContractDetail.vue")).default;
    const wrapper = mount(ContractDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          ScCallTable: true,
          EventsTable: true,
          ErrorState: true,
          ContractHeader: true,
          ContractOverviewCard: true,
          ContractCodeTab: true,
          ContractReadTab: true,
          TabsNav: {
            props: ["tabs", "modelValue"],
            emits: ["update:modelValue"],
            template: '<button data-test="write-tab" @click="$emit(\'update:modelValue\', \'writeContract\')">Write</button>',
          },
          ContractWriteTab: {
            props: ["writeMethods", "writeMethodState"],
            emits: ["invokeMethod"],
            template: `
              <div data-test="write-panel">
                <button data-test="write-transfer" @click="$emit('invokeMethod', 0, writeMethods[0], 1)">Write</button>
                <span data-test="write-error">{{ writeMethodState[0]?.error }}</span>
                <span data-test="write-simulation">{{ writeMethodState[0]?.simulation?.summary }}</span>
              </div>
            `,
          },
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-test="write-tab"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-test="write-transfer"]').trigger("click");
    await flushPromises();

    expect(invokeContractFunction).toHaveBeenCalledWith(
      route.params.hash,
      "transfer",
      [{ type: "Integer", value: "" }],
      [{ account: "408b58900a52b5c2eb599c6cc5c538752e561120", scopes: 1 }],
    );
    expect(walletInvoke).not.toHaveBeenCalled();
    expect(wrapper.get('[data-test="write-error"]').text()).toContain("CheckWitness failed");
    expect(wrapper.get('[data-test="write-simulation"]').text()).toContain("CheckWitness failed");
  });
});
