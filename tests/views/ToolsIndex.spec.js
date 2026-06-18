import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ToolsIndex from "@/views/Tools/ToolsIndex.vue";

function fakeT(key) {
  return key;
}

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = fakeT;
  },
};

const toolEntries = [
  ["/tools/multisig", "tools.multisig.title", "tools.multisig.description"],
  ["/tools/governance", "tools.governance.title", "tools.governance.description"],
  ["/contracts/1", "tools.contractInterface.title", "tools.contractInterface.description"],
  ["/verify-contract", "tools.verifyContract.title", "tools.verifyContract.description"],
  ["/tools/b64", "tools.converter.title", "tools.converter.description"],
  ["/tools/neofs", "tools.neofs.title", "tools.neofs.description"],
  ["/tools/candidate-profile", "tools.candidateProfile.title", "tools.candidateProfile.description"],
  ["/tools/broadcast", "tools.broadcast.title", "tools.broadcast.description"],
  ["/tools/sponsored", "tools.sponsored.title", "tools.sponsored.description"],
  ["/tools/deployer", "tools.deployer.title", "tools.deployer.description"],
  ["/tools/factory", "tools.factory.title", "tools.factory.description"],
  ["/tools/abi", "tools.abi.title", "tools.abi.description"],
  ["/tools/storage", "tools.storage.title", "tools.storage.description"],
  ["/tools/gas", "tools.gas.title", "tools.gas.description"],
  ["/tools/mempool", "tools.mempool.title", "tools.mempool.description"],
  ["/tools/alerts", "tools.alerts.title", "tools.alerts.description"],
  ["/tools/abstract-account", "tools.abstractAccount.title", "tools.abstractAccount.description"],
];

function mountToolsIndex() {
  return mount(ToolsIndex, {
    global: {
      plugins: [i18nPlugin],
      stubs: {
        Breadcrumb: true,
        RouterLink: {
          name: "RouterLink",
          props: ["to"],
          template: '<a v-bind="$attrs" :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
        },
      },
    },
  });
}

describe("ToolsIndex", () => {
  it("renders the complete tools catalog with stable routes and labels", () => {
    const wrapper = mountToolsIndex();
    const links = wrapper.findAll(".etherscan-card");

    expect(links).toHaveLength(toolEntries.length);

    toolEntries.forEach(([href, titleKey, descriptionKey], index) => {
      expect(links[index].attributes("href")).toBe(href);
      expect(links[index].attributes("aria-label")).toBe(titleKey);
      expect(links[index].text()).toContain(titleKey);
      expect(links[index].text()).toContain(descriptionKey);
    });
  });
});
