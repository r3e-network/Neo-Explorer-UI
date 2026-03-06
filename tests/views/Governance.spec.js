import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const COZ_ADDRESS = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
const fetchPricesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ neo: 1, gas: 1 }));
const voteForCandidateMock = vi.hoisted(() => vi.fn());
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
  getCurrentEnv: () => "TestT5",
  NET_ENV: { TestT5: "TestT5", Mainnet: "MainNet" },
}));

vi.mock("@/utils/wallet", async () => {
  const { ref } = await import("vue");
  return {
    connectedAccount: ref(null),
    voteForCandidate: voteForCandidateMock,
  };
});

vi.mock("@/utils/neoHelpers", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    publicKeyToAddress: () => COZ_ADDRESS,
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

describe("Governance view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPricesMock.mockResolvedValue({ neo: 1, gas: 1 });
    executeMock.mockResolvedValue([{ publickey: "PUBKEY1", votes: "100", active: true }]);
    getValidatorMetadataMock.mockResolvedValue([]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, liveness: [] }),
    });
  });

  it("hides the raw address line when a known candidate name is available", async () => {
    const Governance = (await import("@/views/Governance/Governance.vue")).default;
    const wrapper = mount(Governance, {
      global: {
        mocks: {
          $t: (value) => value,
        },
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

    expect(wrapper.text()).toContain("COZ");
    expect(wrapper.text()).not.toContain(COZ_ADDRESS);
  });
});
