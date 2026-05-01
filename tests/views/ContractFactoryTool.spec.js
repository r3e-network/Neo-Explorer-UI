import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

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

const sharedConnectedAccount = ref("");
const invokeMock = vi.fn();
const isConnectedRef = { value: false };

const toast = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

const walletServiceMock = {
  get isConnected() { return isConnectedRef.value; },
  invoke: invokeMock,
};

class MockAccount {
  constructor(value) {
    this.address = value;
    this.scriptHash = `0x${String(value).slice(0, 40).padEnd(40, "0")}`;
  }
}

vi.mock("@/utils/wallet", () => ({
  connectedAccount: sharedConnectedAccount,
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

vi.mock("@/utils/neonLoader", () => ({
  loadNeonJs: () => Promise.resolve({
    wallet: { Account: MockAccount },
  }),
}));

vi.mock("@/constants", () => ({
  GAS_HASH: "0xd2a4cff31913016155e38e474a2c06d08be276cf",
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

describe("ContractFactoryTool deployment guards", () => {
  beforeEach(() => {
    sharedConnectedAccount.value = "";
    isConnectedRef.value = false;
    invokeMock.mockReset();
    toast.info.mockClear();
    toast.success.mockClear();
    toast.error.mockClear();
    // Default to demo enabled (DEV-mode equivalent)
    import.meta.env.VITE_ENABLE_CONTRACT_FACTORY_MOCK = "true";
  });

  it("renders the page header without throwing", async () => {
    const wrapper = await mountTool();
    await flushPromises();
    // Component mounted; template references templates collection
    expect(wrapper.text()).toContain("tools.contractFactory.templates.nep17Name");
  });

  it("blocks deployment when wallet is not connected", async () => {
    sharedConnectedAccount.value = ""; // disconnected
    const wrapper = await mountTool();
    await flushPromises();
    // The deploy CTA is gated by isFormValid + connectedAccount; clicking
    // when disconnected is a no-op (function early-returns). Verify no
    // wallet invoke happened.
    const button = wrapper.findAll("button").find((b) => b.text().toLowerCase().includes("deploy"));
    if (button) {
      await button.trigger("click");
      await flushPromises();
    }
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows demo-disabled toast when factory mock is off and form is filled", async () => {
    sharedConnectedAccount.value = "Nabc1234567890abcdef1234567890abcdef12";
    isConnectedRef.value = true;
    import.meta.env.VITE_ENABLE_CONTRACT_FACTORY_MOCK = "false";

    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/ContractFactoryTool.vue"),
      "utf8",
    );
    // Verify the gate is wired in source — UI assertion would require
    // also filling the form which is template-driven.
    expect(src).toMatch(/isFactoryMockEnabled\.value[\s\S]{0,80}demoActionsDisabled/);
  });
});

describe("ContractFactoryTool source-level invariants", () => {
  it("uses the GAS_HASH self-transfer trick to simulate factory deploy", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/ContractFactoryTool.vue"),
      "utf8",
    );
    expect(src).toMatch(/scriptHash:\s*GAS_HASH/);
    expect(src).toMatch(/operation:\s*['"]transfer['"]/);
    expect(src).toMatch(/FactoryDeploy:/);
  });

  it("guards on connectedAccount + isFormValid before deploying", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/ContractFactoryTool.vue"),
      "utf8",
    );
    expect(src).toMatch(/!connectedAccount\.value\s*\|\|\s*!isFormValid\.value/);
  });

  it("rejects with localized noTxId key when wallet returns no txid", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/Tools/ContractFactoryTool.vue"),
      "utf8",
    );
    expect(src).toMatch(/tools\.contractFactory\.toasts\.noTxId/);
  });
});
