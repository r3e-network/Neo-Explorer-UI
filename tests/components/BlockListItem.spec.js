import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BlockListItem from "@/components/common/BlockListItem.vue";
import { scriptHashToAddress } from "@/utils/neoHelpers";

const { resolvePrimaryIndexMock, getPrimaryNodeNameMock, getPrimaryNodeAddressMock, getPrimaryNodeLogoMock } = vi.hoisted(() => ({
  resolvePrimaryIndexMock: vi.fn((block) => block.primary),
  getPrimaryNodeNameMock: vi.fn(() => "Unknown Validator"),
  getPrimaryNodeAddressMock: vi.fn(() => "0x1234567890abcdef1234567890abcdef12345678"),
  getPrimaryNodeLogoMock: vi.fn(() => "https://example.com/logo.png"),
}));

vi.mock("@vueuse/core", () => ({
  useNow: () => ({ value: new Date() }),
}));

vi.mock("@/utils/explorerFormat", () => ({
  formatAge: () => "just now",
  formatNumber: (n) => n,
  formatGas: (n) => n,
  truncateHash: (value) => value,
}));

vi.mock("@/composables/useCommittee", () => ({
  useCommittee: () => ({
    resolvePrimaryIndex: resolvePrimaryIndexMock,
    getPrimaryNodeName: getPrimaryNodeNameMock,
    getPrimaryNodeAddress: getPrimaryNodeAddressMock,
    getPrimaryNodeLogo: getPrimaryNodeLogoMock,
  }),
}));

describe("BlockListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePrimaryIndexMock.mockImplementation((block) => block.primary);
    getPrimaryNodeNameMock.mockImplementation(() => "Unknown Validator");
    getPrimaryNodeAddressMock.mockImplementation(() => "0x1234567890abcdef1234567890abcdef12345678");
    getPrimaryNodeLogoMock.mockImplementation(() => "https://example.com/logo.png");
  });

  it("renders validator from speaker fallback when nextconsensus is absent", () => {
    const wrapper = mount(BlockListItem, {
      props: {
        block: {
          index: 100,
          timestamp: Date.now(),
          transactioncount: 5,
          systemFee: 1,
          networkFee: 1,
          size: 1000,
          primary: 0,
          speaker: "0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      global: {
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
          HashLink: true,
        },
      },
    });
    expect(wrapper.text()).toContain("Unknown Validator");
  });

  it("hides the raw validator address when a named validator identity is available", () => {
    const validatorScriptHash = "0xc17cb2fc377c619ee0c8e93409fe03eec34943f8";
    const validatorAddress = scriptHashToAddress(validatorScriptHash);

    getPrimaryNodeNameMock.mockImplementation(() => "COZ");
    getPrimaryNodeAddressMock.mockImplementation(() => validatorScriptHash);

    const wrapper = mount(BlockListItem, {
      props: {
        block: {
          index: 101,
          timestamp: Date.now(),
          transactioncount: 7,
          systemFee: 1,
          networkFee: 1,
          size: 1200,
          primary: 0,
          nextconsensus: validatorScriptHash,
        },
      },
      global: {
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
          HashLink: true,
        },
      },
    });

    expect(wrapper.text()).toContain("COZ");
    expect(wrapper.text()).not.toContain(validatorAddress);
  });
});
