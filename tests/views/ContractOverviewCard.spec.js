import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContractOverviewCard from "@/views/Contract/components/ContractOverviewCard.vue";
import { scriptHashToAddress } from "@/utils/neoHelpers";

let consoleWarnSpy;

vi.mock("@/services/supabaseService", () => ({
  supabaseService: {
    getAddressTag: vi.fn(async () => null),
    getValidatorMetadata: vi.fn(async () => []),
    getContractMetadata: vi.fn(async () => null),
  },
}));

vi.mock("@/services", () => ({
  contractService: {
    getByHashWithFallback: vi.fn(async () => null),
  },
}));

vi.mock("@/services/nnsService", () => ({
  default: {
    resolveAddressToNNS: vi.fn(async () => null),
  },
}));

vi.mock("@/utils/healthCheck", () => ({
  checkAndSetEndpoints: vi.fn(() => Promise.resolve()),
}));
describe("ContractOverviewCard", () => {
  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy?.mockRestore();
  });

  it("shows manifest contact metadata from the contract manifest extra block", () => {
    const wrapper = mount(ContractOverviewCard, {
      props: {
        contract: {
          hash: "0x0123456789abcdef0123456789abcdef01234567",
          name: "ContractFromIndex",
          sender: "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp",
          totalsccall: 12,
          updatecounter: 1,
        },
        metadata: null,
        manifest: {
          name: "ManifestContractName",
          extra: {
            Author: "The Neo Project",
            Email: "dev@neo.org",
            Description: "Matrix Name Service",
          },
        },
        isVerified: true,
        supportedStandards: ["NEP-11"],
        methodsCount: 4,
        eventsCount: 2,
      },
      global: {
        stubs: {
          InfoRow: {
            props: ["label", "value", "tooltip", "copyable", "copyValue"],
            template: '<div :data-label="label"><slot>{{ value }}</slot></div>',
          },
          HashLink: true,
        },
      },
    });

    expect(wrapper.find('[data-label="Name"]').text()).toContain("ManifestContractName");
    expect(wrapper.find('[data-label="Developer"]').text()).toContain("The Neo Project");
    expect(wrapper.find('[data-label="Developer Email"]').text()).toContain("dev@neo.org");
    expect(wrapper.find('[data-label="Description"]').text()).toContain("Matrix Name Service");
  });

  it("shows manifest source code link when provided in manifest extra", () => {
    const wrapper = mount(ContractOverviewCard, {
      props: {
        contract: {
          hash: "0x0123456789abcdef0123456789abcdef01234567",
          name: "ContractFromIndex",
          sender: "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp",
          totalsccall: 12,
          updatecounter: 1,
        },
        metadata: null,
        manifest: {
          name: "ManifestContractName",
          extra: {
            Sourcecode: "https://github.com/neo-project/non-native-contracts",
          },
        },
        isVerified: true,
        supportedStandards: [],
        methodsCount: 4,
        eventsCount: 2,
      },
      global: {
        stubs: {
          InfoRow: {
            props: ["label", "value", "tooltip", "copyable", "copyValue"],
            template: '<div :data-label="label"><slot>{{ value }}</slot></div>',
          },
          HashLink: true,
        },
      },
    });

    const sourceRow = wrapper.find('[data-label="Source Code"] a');
    expect(sourceRow.exists()).toBe(true);
    expect(sourceRow.attributes("href")).toBe("https://github.com/neo-project/non-native-contracts");
  });

  it("renders known contract branding when the creator address belongs to a known contract", async () => {
    const wrapper = mount(ContractOverviewCard, {
      props: {
        contract: {
          hash: "0x0123456789abcdef0123456789abcdef01234567",
          name: "ContractFromIndex",
          sender: scriptHashToAddress("0x5a0a0f188f2582ad60c1970267df30ec5428100d"),
          totalsccall: 12,
          updatecounter: 1,
        },
        metadata: null,
        manifest: null,
        isVerified: false,
        supportedStandards: [],
        methodsCount: 4,
        eventsCount: 2,
      },
      global: {
        stubs: {
          InfoRow: {
            props: ["label", "value", "tooltip", "copyable", "copyValue"],
            template: '<div :data-label="label"><slot>{{ value }}</slot></div>',
          },
          RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
        },
      },
    });

    await Promise.resolve();

    expect(wrapper.find('[data-label="Creator"]').text()).toContain("OracleProxy");
    expect(wrapper.find('img[alt="OracleProxy"]').attributes("src")).toBe("https://x.neo.org/favicon.ico");
  });
});
