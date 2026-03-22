import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ContractHeader from "@/views/Contract/components/ContractHeader.vue";

const FULL_HASH = "0x0123456789abcdef0123456789abcdef01234567";

describe("ContractHeader", () => {
  it("renders full contract hash in metadata chip", () => {
    const wrapper = mount(ContractHeader, {
      props: {
        contract: {
          name: "SampleContract",
          hash: FULL_HASH,
        },
        isVerified: false,
        supportedStandards: [],
      },
    });

    expect(wrapper.text()).toContain(FULL_HASH);
    expect(wrapper.text()).not.toContain("...");
  });

  it("falls back to known contract logo when metadata logo is missing", () => {
    const wrapper = mount(ContractHeader, {
      props: {
        contract: {
          name: "NeoXBridge",
          hash: "0xbb19cfc864b73159277e1fd39694b3fd5fc613d2",
        },
        isVerified: false,
        supportedStandards: [],
        metadata: null,
      },
    });

    const logo = wrapper.find('img[alt="Contract Logo"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("https://x.neo.org/favicon.ico");
  });
});
