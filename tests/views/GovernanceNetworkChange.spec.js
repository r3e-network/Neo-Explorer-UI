import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = { value: "MainNet" };
const fetchPricesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ neo: 1, gas: 1 }));
const voteForCandidateMock = vi.hoisted(() => vi.fn());
const unvoteCandidateMock = vi.hoisted(() => vi.fn());
const getValidatorMetadataMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const toastInfoMock = vi.hoisted(() => vi.fn());
const executeMock = vi.hoisted(() => vi.fn().mockResolvedValue([{ publickey: "PUBKEY1", votes: "100", active: true }]));

vi.mock("@/composables/usePriceCache", () => ({
  usePriceCache: () => ({ fetchPrices: fetchPricesMock }),
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({ info: toastInfoMock, error: vi.fn(), success: vi.fn() }),
}));

vi.mock("@/utils/env", () => ({
  getRpcClientUrl: () => "http://rpc.test",
  getCurrentEnv: () => envState.value,
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  NET_ENV: { TestT5: "TestT5", Mainnet: "MainNet" },
}));

vi.mock("@/utils/wallet", async () => {
  const { ref } = await import("vue");
  return {
    connectedAccount: ref(null),
    voteForCandidate: voteForCandidateMock,
    unvoteCandidate: unvoteCandidateMock,
  };
});

vi.mock("@/utils/neoHelpers", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    publicKeyToAddress: () => "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w",
  };
});

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getValidatorMetadata: getValidatorMetadataMock,
  },
}));

vi.mock("@cityofzion/neon-js", () => ({
  rpc: {
    RPCClient: class {
      execute(...args) {
        return executeMock(...args);
      }
    },
    Query: class {
      constructor(config) {
        this.config = config;
      }
    },
  },
}));

describe("Governance network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.value = "MainNet";
    fetchPricesMock.mockResolvedValue({ neo: 1, gas: 1 });
    executeMock.mockResolvedValue([{ publickey: "PUBKEY1", votes: "100", active: true }]);
    getValidatorMetadataMock.mockResolvedValue([]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, liveness: [] }),
    });
  });

  it("reloads candidate data when the explorer network changes", async () => {
    const Governance = (await import("@/views/Governance/Governance.vue")).default;
    const wrapper = mount(Governance, {
      global: {
        mocks: { $t: (value) => value },
        stubs: {
          Breadcrumb: true,
          Skeleton: true,
          ErrorState: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();
    await flushPromises();
    expect(executeMock).toHaveBeenCalledTimes(1);

    envState.value = "TestT5";
    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();
    await flushPromises();

    expect(executeMock).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
