import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("GovernanceCouncilWalletSetupCard", () => {
  it("renders the council wallet setup kit and reveals the NeoLine checklist", async () => {
    const Component = (await import("@/views/Tools/components/GovernanceCouncilWalletSetupCard.vue")).default;

    const wrapper = mount(Component, {
      props: {
        committeeMultiSig: { address: "NZqVw6G8PkM5oQJrjX6kN1H5eYc8m4u9Qf" },
        committeePubkeys: [
          "03f35d7ba09f0a14f0a0f8fdd2cd2db39647c80270f65a52d03d2cceb36b5250c5",
          "03e66f7f5f327f7eb5c11bfb2bde0864e80f98f2f0f9f4f23ae86f0fd82d4f0f60",
        ],
        threshold: 2,
        committeeSize: 2,
        connectedAccount: "NSmKqfS6nR5dA8gVn4hU2pLw9bY7xT3cQe",
        activeNetworkLabel: "Mainnet",
      },
      global: {
        mocks: { $t: (k) => k },
        stubs: {
          CopyButton: {
            props: ["text", "label"],
            template: '<button type="button">{{ label || "copy" }}</button>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain("tools.governance.councilWalletSetupTitle");
    expect(wrapper.text()).toContain("NZqVw6G8PkM5oQJrjX6kN1H5eYc8m4u9Qf");
    expect(wrapper.text()).toContain("tools.governance.downloadSetupJson");

    await wrapper.find('button[aria-label="tools.governance.councilWalletSetupToggleAria"]').trigger("click");

    expect(wrapper.text()).toContain("tools.governance.neoLineChecklistTitle");
    expect(wrapper.text()).toContain("tools.governance.checklistStep2");
    expect(wrapper.text()).toContain("tools.governance.committeePublicKeys");
  });
});
