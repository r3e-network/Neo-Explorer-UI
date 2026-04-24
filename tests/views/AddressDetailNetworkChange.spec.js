import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const route = { params: { accountAddress: "NTestAddress123" } };
const getByAddress = vi.fn();
const getAssets = vi.fn();
const getContractByHash = vi.fn();
const getContractByHashWithFallback = vi.fn();
const getCandidateByAddress = vi.fn();
const getVotesByAddress = vi.fn();
const getCandidateCount = vi.fn();
const getCandidateList = vi.fn();
const getVotersByAddress = vi.fn();
const getNep17Transfers = vi.fn();
const getNep11Transfers = vi.fn();
const getTokenByHash = vi.fn();
const getValidatorMetadata = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

vi.mock("@/utils/healthCheck", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key) => key,
  }),
}));

vi.mock("@/services", () => ({
  accountService: {
    getByAddress,
    getAssets,
    getNep17Transfers,
    getNep11Transfers,
  },
  transactionService: {
    getByAddress: vi.fn().mockResolvedValue({ result: [], totalCount: 0 }),
  },
  contractService: {
    getByHash: getContractByHash,
    getByHashWithFallback: getContractByHashWithFallback,
  },
  candidateService: {
    getByAddress: getCandidateByAddress,
    getVotesByAddress,
    getCount: getCandidateCount,
    getList: getCandidateList,
    getVotersByAddress,
  },
  tokenService: {
    getByHash: getTokenByHash,
  },
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getValidatorMetadata,
  },
}));

vi.mock("@/services/cache", () => ({
  cachedRequest: vi.fn(),
}));

vi.mock("@/composables/useTransferSummary", () => ({
  useTransferSummary: () => ({
    transferSummaryByHash: ref({}),
    enrichTransactions: vi.fn(),
  }),
}));

vi.mock("@/composables/usePagination", async () => {
  const actual = await vi.importActual("vue");
  const { ref } = actual;
  return {
    usePagination: () => ({
      items: ref([]),
      loading: ref(false),
      error: ref(""),
      currentPage: ref(1),
      pageSize: ref(10),
      totalCount: ref(0),
      totalPages: ref(1),
      loadPage: vi.fn().mockResolvedValue(undefined),
      goToPage: vi.fn(),
      changePageSize: vi.fn(),
    }),
  };
});

vi.mock("@/utils/addressDetail", () => ({
  getAddressDetailTabs: vi.fn(() => [{ key: "transactions", label: "Transactions" }]),
  normalizeAccountSummary: vi.fn(() => ({ neoBalance: "1", gasBalance: "2", txCount: 3, tokenCount: 1 })),
  pickBestCandidateVotes: vi.fn((current) => current || "0"),
  sumCandidateVoterBalances: vi.fn(() => "0"),
  splitAddressAssets: vi.fn(() => ({ fungibleAssets: [], nftAssets: [] })),
  normalizeAddressTransactions: vi.fn((value) => value),
  normalizeNep17Transfers: vi.fn((value) => value),
  normalizeNep11Transfers: vi.fn((value) => value),
  downloadTransactionsCsv: vi.fn(),
}));

vi.mock("@/utils/neoHelpers", () => ({
  addressToScriptHash: vi.fn(() => "0xabc"),
  scriptHashToAddress: vi.fn((value) => value),
}));

vi.mock("@/utils/dora", () => ({
  getDoraCommitteeCacheKey: vi.fn(() => "committee"),
  getDoraCommitteeUrl: vi.fn(() => "https://example.com/committee"),
}));

vi.mock("@/utils/logoOptimization", () => ({
  getDefaultCandidateLogoUrl: vi.fn(() => "https://example.com/default.png"),
  resolveCandidateLogoUrl: vi.fn((value) => value),
}));

describe("AddressDetail network changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.accountAddress = "NTestAddress123";
    getAssets.mockResolvedValue([{ hash: "0xasset", balance: "1", tokenname: "Asset", decimals: 0, standard: "NEP17" }]);
    getByAddress.mockResolvedValue({});
    getContractByHash.mockResolvedValue(null);
    getContractByHashWithFallback.mockResolvedValue(null);
    getCandidateByAddress.mockResolvedValue(null);
    getVotesByAddress.mockResolvedValue(null);
    getCandidateCount.mockResolvedValue(0);
    getCandidateList.mockResolvedValue({ result: [] });
    getVotersByAddress.mockResolvedValue({ result: [], totalCount: 0 });
    getNep17Transfers.mockResolvedValue({ result: [], totalCount: 0 });
    getNep11Transfers.mockResolvedValue({ result: [], totalCount: 0 });
    getTokenByHash.mockResolvedValue(null);
    getValidatorMetadata.mockResolvedValue([]);
  });

  it("reloads address data when the explorer network changes", async () => {
    const AddressDetail = (await import("@/views/Account/AddressDetail.vue")).default;
    const wrapper = mount(AddressDetail, {
      global: {
        plugins: [i18nPlugin],
        stubs: {
          Breadcrumb: true,
          TabsNav: true,
          AddressHeader: true,
          AddressTransactionsTab: true,
          AddressTokenTransfersTab: true,
          AddressNftTransfersTab: true,
          AddressTokensTab: true,
          AddressNftsTab: true,
          AddressVotersTab: true,
        },
      },
    });

    await flushPromises();
    expect(getAssets).toHaveBeenCalledTimes(1);
    expect(getByAddress).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", { detail: { env: "TestT5" } }));
    await flushPromises();

    expect(getAssets).toHaveBeenCalledTimes(2);
    expect(getByAddress).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });
});
