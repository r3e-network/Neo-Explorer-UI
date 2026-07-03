import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContractSourceCodePanel from "@/components/contract/ContractSourceCodePanel.vue";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

function mountPanel(props = {}) {
  return mount(ContractSourceCodePanel, {
    props: {
      contractHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
      updatecounter: 0,
      showToolbar: false,
      externalSourceUrl: "https://raw.githubusercontent.com/r3e-network/sample-contract/main/Contract.cs",
      ...props,
    },
    global: {
      plugins: [i18nPlugin],
      stubs: {
        EmptyState: { template: '<div data-test="empty"><slot />{{ message }}</div>', props: ["message", "description"] },
        ErrorState: { template: '<div data-test="error">{{ title }}</div>', props: ["title", "message"] },
        Skeleton: { template: '<div data-test="skeleton"></div>' },
        CopyButton: { template: "<button>copy</button>", props: ["text", "size"] },
      },
    },
  });
}

describe("ContractSourceCodePanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and renders source code from a manifest source URL before falling back to empty verified-source state", async () => {
    const source = "using Neo.SmartContract.Framework;\npublic class Contract : SmartContract {}";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      url: "https://raw.githubusercontent.com/r3e-network/sample-contract/main/Contract.cs",
      headers: {
        get(name) {
          if (name.toLowerCase() === "content-type") return "text/plain; charset=utf-8";
          if (name.toLowerCase() === "content-length") return String(source.length);
          return null;
        },
      },
      text: () => Promise.resolve(source),
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mountPanel();
    await flushPromises();
    await flushPromises();
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await flushPromises();

    expect(fetchMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Contract.cs");
    expect(wrapper.text()).toContain("using Neo.SmartContract.Framework");
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false);
  });
});
