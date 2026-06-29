import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ContractReadTab from "@/views/Contract/components/ContractReadTab.vue";

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key, params = {}) =>
      Object.keys(params).reduce((out, name) => out.replace(`{${name}}`, params[name]), key);
  },
};

function mountReadTab(props = {}) {
  const readMethods = [
    { name: "symbol", safe: true, parameters: [], returntype: "String" },
    { name: "balanceOf", safe: true, parameters: [{ name: "account", type: "Hash160" }], returntype: "Integer" },
  ];
  return mount(ContractReadTab, {
    props: {
      readMethods,
      readMethodState: readMethods.map(() => ({ open: false, params: [], loading: false, result: undefined, error: "" })),
      manifest: { abi: { methods: readMethods } },
      autoReadState: {
        symbol: {
          loading: false,
          result: {
            state: "HALT",
            stack: [{ type: "ByteString", value: btoa("NEO") }],
          },
          refreshedAt: 1700000000000,
        },
      },
      ...props,
    },
    global: {
      plugins: [i18nPlugin],
      stubs: { ParamInput: true },
    },
  });
}

describe("ContractReadTab auto-read values", () => {
  it("shows no-parameter safe method values and emits a per-value refresh event", async () => {
    const wrapper = mountReadTab();

    const rows = wrapper.findAll('[data-test="auto-read-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain("symbol");
    expect(rows[0].text()).toContain("String");
    expect(rows[0].text()).toContain("NEO");

    await rows[0].get('[data-test="refresh-auto-read"]').trigger("click");
    expect(wrapper.emitted("refreshAutoRead")).toEqual([["symbol"]]);
  });
});
