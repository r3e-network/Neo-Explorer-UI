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
});
