import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const COZ_SCRIPT_HASH = "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8";
const COZ_ADDRESS = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";

const { getValidatorMetadataMock, cachedRequestMock } = vi.hoisted(() => ({
  getValidatorMetadataMock: vi.fn().mockResolvedValue([]),
  cachedRequestMock: vi.fn().mockResolvedValue([]),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (value) => value }),
}));

vi.mock("@/services", () => ({
  candidateService: {
    getList: vi.fn(),
  },
}));

vi.mock("@/services/cache", () => ({
  getCacheKey: vi.fn(() => "candidate-list"),
  cachedRequest: cachedRequestMock,
}));

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getValidatorMetadata: getValidatorMetadataMock,
  },
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => "MainNet",
  NET_ENV: { TestT5: "TestT5", Mainnet: "MainNet" },
}));

vi.mock("@/components/common/HashLink.vue", () => ({
  default: {
    name: "HashLink",
    template: '<div data-testid="hash-link"></div>',
  },
}));

vi.mock("@/utils/logoOptimization", () => ({
  getDefaultCandidateLogoUrl: vi.fn(() => ""),
  resolveCandidateLogoUrl: (value) => value,
}));

vi.mock("@/composables/usePagination", async () => {
  const { ref } = await import("vue");
  return {
    usePagination: () => ({
      items: ref([
        {
          candidate: COZ_SCRIPT_HASH,
          publickey: "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b",
          votes: "100",
          isCommittee: true,
        },
      ]),
      loading: ref(false),
      error: ref(""),
      totalCount: ref(1),
      currentPage: ref(1),
      pageSize: ref(10),
      totalPages: ref(1),
      loadPage: vi.fn(),
      goToPage: vi.fn(),
      changePageSize: vi.fn(),
    }),
  };
});

describe("Candidates view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getValidatorMetadataMock.mockResolvedValue([]);
    cachedRequestMock.mockResolvedValue([]);
  });

  it("hides the raw address line when a known candidate name is available", async () => {
    const Candidates = (await import("@/views/Candidate/Candidates.vue")).default;
    const wrapper = mount(Candidates, {
      global: {
        mocks: {
          $t: (value) => value,
        },
        stubs: {
          Breadcrumb: true,
          EmptyState: true,
          ErrorState: true,
          Skeleton: true,
          EtherscanPagination: true,
          StatusBadge: true,
          HashLink: true,
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("COZ");
    expect(wrapper.text()).not.toContain(COZ_ADDRESS);
  });
});
