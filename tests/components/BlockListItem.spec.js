import { mount, config } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BlockListItem from "@/components/common/BlockListItem.vue";

config.global.mocks = { ...(config.global.mocks || {}), $t: (k) => k };
import { scriptHashToAddress } from "@/utils/neoHelpers";

const { resolvePrimaryIndexMock, getPrimaryNodeNameMock, getPrimaryNodeAddressMock, getPrimaryNodeLogoMock } = vi.hoisted(() => ({
  resolvePrimaryIndexMock: vi.fn((block) => block.primary),
  getPrimaryNodeNameMock: vi.fn(() => "Unknown Validator"),
  getPrimaryNodeAddressMock: vi.fn(() => "0x1234567890abcdef1234567890abcdef12345678"),
  getPrimaryNodeLogoMock: vi.fn(() => "https://example.com/logo.png"),
}));
const useNowMock = vi.hoisted(() => vi.fn(() => ({ value: new Date() })));

vi.mock("@vueuse/core", () => ({
  useNow: useNowMock,
}));

vi.mock("vue-i18n", async () => {
  const actual = await vi.importActual("vue-i18n");
  return {
    ...actual,
    useI18n: () => ({
      t: (k, params) => {
        if (params?.n !== undefined) return `${k} ${params.n}`;
        return k;
      },
      locale: { value: "en" },
    }),
  };
});

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
  isFallbackValidatorName: (name) => {
    if (!name) return true;
    return /^Consensus Node(?: \d+)?$/i.test(String(name).trim());
  },
}));

describe("BlockListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePrimaryIndexMock.mockImplementation((block) => block.primary);
    getPrimaryNodeNameMock.mockImplementation(() => "Unknown Validator");
    getPrimaryNodeAddressMock.mockImplementation(() => "0x1234567890abcdef1234567890abcdef12345678");
    getPrimaryNodeLogoMock.mockImplementation(() => "https://example.com/logo.png");
  });

  it("updates relative ages every second", () => {
    mount(BlockListItem, {
      props: {
        block: {
          index: 99,
          timestamp: Date.now(),
          transactioncount: 1,
          systemFee: 1,
          networkFee: 1,
          size: 900,
          primary: 0,
          nextconsensus: "0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      global: {
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
          HashLink: true,
        },
      },
    });

    expect(useNowMock).toHaveBeenCalledWith({ interval: 1000 });
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

  it("falls back to summing transaction fees when aggregate block fees are zero", () => {
    const wrapper = mount(BlockListItem, {
      props: {
        block: {
          index: 102,
          timestamp: Date.now(),
          transactioncount: 2,
          sysfee: 0,
          netfee: 0,
          tx: [
            { sysfee: 100, netfee: 10 },
            { sysfee: 200, netfee: 20 },
          ],
          size: 1400,
          primary: 0,
          nextconsensus: "0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      global: {
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
          HashLink: true,
        },
      },
    });

    expect(wrapper.text()).toContain("330 GAS");
  });

  it("renders a compact validated marker beside the block height", () => {
    const blockHash = "0xvalidated-block";
    const wrapper = mount(BlockListItem, {
      props: {
        stateRootValidated: true,
        stateRootValidatedHeight: 105,
        block: {
          hash: blockHash,
          index: 103,
          timestamp: Date.now(),
          transactioncount: 1,
          systemFee: 1,
          networkFee: 1,
          size: 900,
          primary: 0,
          nextconsensus: "0x1234567890abcdef1234567890abcdef12345678",
        },
      },
      global: {
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
          HashLink: true,
        },
      },
    });

    expect(wrapper.text()).toContain("✅");
    expect(wrapper.text()).not.toContain("homePage.miniValidatedStateRoot");

    const heightLink = wrapper.find("a");
    expect(heightLink.attributes("title")).toContain(blockHash);
    expect(heightLink.attributes("title")).toContain("homePage.stateRootValidatedThrough");
    expect(heightLink.attributes("title")).toContain("105");

    const marker = wrapper.get('[role="img"]');
    expect(marker.attributes("title")).toContain("homePage.stateRootValidatedThrough");
    expect(marker.attributes("title")).toContain("105");
    expect(marker.attributes("aria-label")).toContain("homePage.stateRootValidatedThrough");
  });
});
