import { mount, flushPromises } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const COZ_ADDRESS = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
const CANDIDATE_PUBKEY = "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b";
const fetchPricesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ neo: 1, gas: 1 }));
const voteForCandidateMock = vi.hoisted(() => vi.fn());
const unvoteCandidateMock = vi.hoisted(() => vi.fn());
const getValidatorMetadataMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const toastInfoMock = vi.hoisted(() => vi.fn());
const safeRpcMock = vi.hoisted(() => vi.fn());
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

vi.mock("@/services/api", () => ({
  safeRpc: safeRpcMock,
}));

function mockSafeRpc({
  candidates = [{ publickey: CANDIDATE_PUBKEY, votes: "100", active: true }],
  accountState = { stack: [{ type: "Any" }] },
  gasPerBlockRaw = "100000000",
} = {}) {
  safeRpcMock.mockImplementation(async (method, params = []) => {
    if (method === "getcandidates") return candidates;
    if (method === "invokefunction" && params[1] === "getGasPerBlock") {
      return { state: "HALT", stack: [{ type: "Integer", value: gasPerBlockRaw }] };
    }
    if (method === "invokefunction" && params[1] === "getAccountState") {
      return accountState;
    }
    return null;
  });
}

describe("Governance view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectedAccountRef.value = null;
    fetchPricesMock.mockResolvedValue({ neo: 1, gas: 1 });
    mockSafeRpc();
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
    expect(wrapper.text()).toContain("governancePage.colCouncilNode");
  });

  it("shows Unvote for the candidate currently selected by the connected account", async () => {
    connectedAccountRef.value = COZ_ADDRESS;
    mockSafeRpc({
      accountState: {
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
      },
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

  it("scales APR to live gasPerBlock (regression: prior 5 GAS/block hardcode inflated 5x)", async () => {
    // Drive the page with a single rank-1 (consensus) candidate that has
    // a clean round number of votes and a NeoToken.getGasPerBlock that
    // returns 1.0 (the live mainnet value). With NEO=$1, GAS=$1, and
    // 1000 NEO voting:
    //   per-block voter share = 1000 * (0.4 / 7) / 1_000_000_000 = 5.71e-8
    //   plus base = 1000 * (0.1 / 1e8) = 1e-6 GAS/block
    //   monthly  = (5.71e-8 + 1e-6) * 876_000 ≈ 0.926 GAS
    //   annual   ≈ 11.11 GAS = $11.11 yield on a $1000 stake
    //   APR      ≈ 1.11 %
    // The pre-fix formula would have yielded ~5.55 % at the same prices,
    // so any number above 2.0 % means the regression is back.
    mockSafeRpc({
      candidates: [{ publickey: CANDIDATE_PUBKEY, votes: "1000000000", active: true }],
      gasPerBlockRaw: "100000000",
    });

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

    const aprMatch = wrapper.text().match(/(\d+(?:\.\d+)?)\s*%/);
    expect(aprMatch).not.toBeNull();
    const aprPercent = Number(aprMatch[1]);
    expect(aprPercent).toBeGreaterThan(0);
    expect(aprPercent).toBeLessThan(2.0);
  });

  it("keeps the read-only governance page off the heavy neon-js runtime path", () => {
    const source = readFileSync(path.resolve(process.cwd(), "src/views/Governance/Governance.vue"), "utf8");

    expect(source).toContain('safeRpc("getcandidates"');
    expect(source).toContain("CANDIDATES_LOAD_TIMEOUT_MS");
    expect(source).toContain("buildCandidateRows(rawCandidates)");
    expect(source).toContain("void enrichCandidateMetadata");
    expect(source).not.toContain("@/utils/neonLoader");
    expect(source).not.toContain("@cityofzion/neon-js");
    expect(source).not.toContain("new RpcClient");
  });
});
