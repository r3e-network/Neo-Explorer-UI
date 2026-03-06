import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ContractOverviewCard from "@/views/Contract/components/ContractOverviewCard.vue";

describe("ContractOverviewCard", () => {
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
});
