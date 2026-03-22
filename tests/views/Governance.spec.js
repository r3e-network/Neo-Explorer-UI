import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const COZ_ADDRESS = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
const CANDIDATE_PUBKEY = "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b";
const fetchPricesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ neo: 1, gas: 1 }));
const voteForCandidateMock = vi.hoisted(() => vi.fn());
const unvoteCandidateMock = vi.hoisted(() => vi.fn());
const getValidatorMetadataMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const toastInfoMock = vi.hoisted(() => vi.fn());
const executeMock = vi.hoisted(() => vi.fn());
const connectedAccountRef = vi.hoisted(() => ({ value: null }));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
    locale: { value: "en" },
  }),
}));

vi.mock("@/composables/usePriceCache", () => ({
  usePriceCache: () => ({ fetchPrices: fetchPricesMock }),
}));

vi.mock("vue-toastification", () => ({
  useToast: () => ({ info: toastInfoMock, error: vi.fn(), success: vi.fn() }),
}));

vi.mock("@/utils/env", () => ({
  getRpcClientUrl: () => "http://rpc.test",
  getCurrentEnv: () => "TestT5",
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  NET_ENV: { TestT5: "TestT5", Mainnet: "MainNet" },
}));

vi.mock("@/utils/wallet", async () => {
  return {
    connectedAccount: {
      __v_isRef: true,
      get value() {
        return connectedAccountRef.value;
      },
      set value(next) {
        connectedAccountRef.value = next;
      },
    },
    voteForCandidate: voteForCandidateMock,
    unvoteCandidate: unvoteCandidateMock,
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

vi.mock("@/utils/logoOptimization", () => ({
  getDefaultCandidateLogoUrl: vi.fn(() => ""),
  resolveCandidateLogoUrl: (value) => value,
}));

vi.mock("@r3e/neo-js-sdk", () => ({
  RpcClient: class {
    async getCandidates() {
      return executeMock({ config: { method: "getcandidates" } });
    }
    async invokeFunction(scriptHash, method, params, signers) {
      return executeMock({ config: { method: "invokefunction" } });
    }
  },
}));

describe("Governance view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectedAccountRef.value = null;
    fetchPricesMock.mockResolvedValue({ neo: 1, gas: 1 });
    executeMock.mockImplementation((query) => {
      const method = query?.config?.method;
      if (method === "getcandidates") {
        return [{ publickey: CANDIDATE_PUBKEY, votes: "100", active: true }];
      }
      if (method === "invokefunction") {
        return { stack: [{ type: "Any" }] };
      }
      return [];
    });
    getValidatorMetadataMock.mockResolvedValue([]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, liveness: [] }),
    });
  });

  it("hides the raw address line when a known candidate name is available", async () => {
    getValidatorMetadataMock.mockResolvedValueOnce([
      {
        public_key: CANDIDATE_PUBKEY,
        display_name: "Council Alpha",
        logo_url: "https://example.com/council-alpha.png",
      },
    ]);

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

    expect(wrapper.text()).toContain("Council Alpha");
    expect(wrapper.text()).not.toContain(COZ_ADDRESS);
    expect(wrapper.text()).toContain(CANDIDATE_PUBKEY);
    expect(wrapper.text()).toContain("Active");
    expect(wrapper.find('img[alt="Council Alpha Logo"]').attributes("src")).toBe(
      "https://example.com/council-alpha.png",
    );
    expect(wrapper.text()).not.toContain("Public Key / Name");
    expect(wrapper.text()).toContain("Council Node");
  });

  it("shows Unvote for the candidate currently selected by the connected account", async () => {
    connectedAccountRef.value = COZ_ADDRESS;
    executeMock.mockImplementation((query) => {
      const method = query?.config?.method;
      if (method === "getcandidates") {
        return [{ publickey: CANDIDATE_PUBKEY, votes: "100", active: true }];
      }
      if (method === "invokefunction") {
        return {
          stack: [
            {
              type: "Struct",
              value: [
                { type: "Integer", value: "1" },
                { type: "Integer", value: "1" },
                { type: "ByteString", value: Buffer.from(CANDIDATE_PUBKEY, "hex").toString("base64") },
                { type: "Integer", value: "1" },
              ],
            },
          ],
        };
      }
      return [];
    });

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

    expect(wrapper.text()).toContain("Unvote");
  });
});
