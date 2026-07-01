import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ContractCodeTab from "@/views/Contract/components/ContractCodeTab.vue";

const mocks = vi.hoisted(() => ({
  decompileContractState: vi.fn(),
  highlight: vi.fn(),
}));

vi.mock("@/utils/contractDecompiler", () => ({
  decompileContractState: mocks.decompileContractState,
}));

vi.mock("highlight.js/lib/core", () => ({
  default: {
    registerLanguage: vi.fn(),
    highlight: mocks.highlight,
  },
}));

vi.mock("highlight.js/lib/languages/csharp", () => ({
  default: vi.fn(),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key, params = {}) =>
      Object.keys(params).reduce((out, name) => out.replace(`{${name}}`, params[name]), key);
  },
};

function mountCodeTab(props = {}) {
  return mount(ContractCodeTab, {
    props: {
      contractHash: "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd",
      updateCounter: 0,
      sourceCodeLocation: "/source-code",
      manifest: { name: "NeoToken", abi: { methods: [], events: [] } },
      supportedStandards: [],
      contractState: {
        nef: {
          script: "EUA=",
        },
      },
      ...props,
    },
    global: {
      plugins: [i18nPlugin],
      stubs: {
        RouterLink: { template: "<a><slot /></a>" },
        ContractSourceCodePanel: true,
        CollapsibleSection: { template: "<section><h3>{{ title }}</h3><slot name='title-suffix' /><slot /></section>", props: ["title"] },
        ContractJsonView: true,
        CopyButton: { template: "<button data-test='copy-decompiled'>copy</button>", props: ["text", "size"] },
      },
    },
  });
}

describe("ContractCodeTab decompiler", () => {
  it("renders decompiled code with C# highlight markup", async () => {
    mocks.decompileContractState.mockResolvedValueOnce({
      code: "contract NeoToken {\n    public static string Symbol() => \"NEO\";\n}",
      warnings: ["best effort"],
    });
    mocks.highlight.mockReturnValueOnce({
      value: '<span class="hljs-keyword">contract</span> NeoToken',
    });

    const wrapper = mountCodeTab();
    await flushPromises();

    expect(mocks.decompileContractState).toHaveBeenCalledWith(
      expect.objectContaining({ nef: expect.any(Object) }),
      expect.objectContaining({ name: "NeoToken" }),
    );
    const code = wrapper.get('[data-test="decompiled-code"]');
    expect(code.classes()).toContain("language-csharp");
    expect(code.html()).toContain("hljs-keyword");
    expect(wrapper.text()).toContain("contractDetail.decompileWarnings");
  });

  it("places decompiled code before the verified-source panel", async () => {
    mocks.decompileContractState.mockResolvedValueOnce({
      code: "contract NeoToken {\n    public static string Symbol() => \"NEO\";\n}",
      warnings: [],
    });
    mocks.highlight.mockReturnValueOnce({
      value: '<span class="hljs-keyword">contract</span> NeoToken',
    });

    const wrapper = mountCodeTab();
    await flushPromises();

    const html = wrapper.html();
    expect(html.indexOf('data-test="decompiled-code"')).toBeGreaterThan(-1);
    expect(html.indexOf("contract-source-code-panel-stub")).toBeGreaterThan(-1);
    expect(html.indexOf('data-test="decompiled-code"')).toBeLessThan(
      html.indexOf("contract-source-code-panel-stub"),
    );
  });
});
