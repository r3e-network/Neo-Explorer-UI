import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

function fakeT(key, params) {
  if (!params || Object.keys(params).length === 0) return key;
  const entries = Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(",");
  return `${key}(${entries})`;
}

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: fakeT }),
}));

const toast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = fakeT;
  },
};

async function mountTool() {
  const ContractFactoryTool = (await import("@/views/Tools/ContractFactoryTool.vue")).default;
  return mount(ContractFactoryTool, {
    global: {
      plugins: [i18nPlugin],
      stubs: {
        Breadcrumb: true,
        RouterLink: { template: "<a><slot /></a>" },
      },
    },
  });
}

function buttonByText(wrapper, text) {
  return wrapper.findAll("button").find((button) => button.text().includes(text));
}

describe("ContractFactoryTool blueprint generator", () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it("renders the template selector and blueprint guidance", async () => {
    const wrapper = await mountTool();
    await flushPromises();

    expect(wrapper.text()).toContain("tools.contractFactory.templates.nep17Name");
    expect(wrapper.text()).toContain("tools.contractFactory.blueprintModeLabel");
    expect(wrapper.text()).toContain("tools.contractFactory.blueprintEmpty");
  });

  it("generates a deterministic NEP-17 blueprint from the form", async () => {
    const wrapper = await mountTool();
    await flushPromises();

    const inputs = wrapper.findAll("input");
    await inputs[3].setValue("Audit Token");
    await inputs[4].setValue("AUD");

    await buttonByText(wrapper, "tools.contractFactory.generateBlueprint").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("neo3scan.contract-blueprint.v1");
    expect(wrapper.text()).toContain('"standard": "NEP-17"');
    expect(wrapper.text()).toContain('"symbol": "AUD"');
    expect(wrapper.text()).toContain('"deployerPath": "/tools/deployer"');
    expect(toast.success).toHaveBeenCalledWith("tools.contractFactory.toasts.blueprintGenerated");
  });
});

describe("ContractFactoryTool source-level invariants", () => {
  it("does not retain production mock deployment or fake NeoFS upload paths", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/ContractFactoryTool.vue"),
      "utf8",
    );

    expect(src).not.toMatch(/FactoryDeploy:/);
    expect(src).not.toMatch(/GAS_HASH/);
    expect(src).not.toMatch(/walletService/);
    expect(src).not.toMatch(/VITE_ENABLE_CONTRACT_FACTORY_MOCK/);
    expect(src).not.toMatch(/Mock successful upload/);
  });

  it("supports copy and download handoff actions", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/ContractFactoryTool.vue"),
      "utf8",
    );

    expect(src).toMatch(/copyTextToClipboard/);
    expect(src).toMatch(/URL\.createObjectURL/);
    expect(src).toMatch(/deployerPath/);
  });
});
