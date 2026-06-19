import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

const baseProps = {
  supportedProviders: [
    "NeoLine",
    "Testnet WIF (Local Dev)",
    "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
  ],
  walletLoading: false,
  isProviderAvailable: (p) => p !== "EVM Wallets (MetaMask, OKX, Rabby, etc.)",
  getProviderUnavailableReason: () => "not installed",
};

async function mountModal(propsOverride = {}) {
  const HeaderWalletModal = (await import("@/components/layout/HeaderWalletModal.vue")).default;
  return mount(HeaderWalletModal, {
    props: { ...baseProps, ...propsOverride },
    global: { plugins: [i18nPlugin] },
    attachTo: document.body,
  });
}

describe("HeaderWalletModal", () => {
  it("renders one option per supportedProvider", async () => {
    const wrapper = await mountModal();
    await flushPromises();
    const optionButtons = wrapper.findAll(".wallet-modal-option");
    expect(optionButtons).toHaveLength(3);
  });

  it("emits close when the X button is clicked", async () => {
    const wrapper = await mountModal();
    await flushPromises();
    const closeBtn = wrapper.find(".wallet-modal-close");
    await closeBtn.trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("emits close when the backdrop is clicked", async () => {
    const wrapper = await mountModal();
    await flushPromises();
    const dialog = wrapper.find('[role="dialog"]');
    await dialog.trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("emits close on Escape", async () => {
    const wrapper = await mountModal();
    await flushPromises();
    const dialog = wrapper.find('[role="dialog"]');
    await dialog.trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("emits close when Escape is pressed at global level", async () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const wrapper = await mountModal();
    await flushPromises();

    const keydownHandler = addListener.mock.calls.find(([eventName]) => eventName === "keydown")?.[1];
    expect(keydownHandler).toEqual(expect.any(Function));
    keydownHandler(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(wrapper.emitted("close")).toHaveLength(1);
    addListener.mockRestore();
  });

  it("emits connect with the provider name for non-WIF providers", async () => {
    const wrapper = await mountModal();
    await flushPromises();
    const neoLine = wrapper.findAll(".wallet-modal-option").find((b) => b.text().includes("NeoLine"));
    await neoLine.trigger("click");
    expect(wrapper.emitted("connect")).toEqual([["NeoLine"]]);
  });

  it("shows unavailable wallet reasons inline while keeping the install action clickable", async () => {
    const wrapper = await mountModal();
    await flushPromises();

    const evm = wrapper
      .findAll(".wallet-modal-option")
      .find((button) => button.text().includes("EVM Wallets"));
    expect(evm.text()).toContain("not installed");
    expect(evm.text()).toContain("header.open");
    expect(evm.attributes("title")).toBe("not installed");
    expect(evm.attributes("aria-label")).toBe("EVM Wallets (MetaMask, OKX, Rabby, etc.). not installed");

    const helpId = evm.attributes("aria-describedby");
    expect(helpId).toMatch(/^wallet-provider-help-/);
    expect(wrapper.find(`[id="${helpId}"]`).text()).toBe("not installed");

    await evm.trigger("click");
    expect(wrapper.emitted("connect")).toEqual([["EVM Wallets (MetaMask, OKX, Rabby, etc.)"]]);
  });

  it("marks configuration-gated providers as unavailable instead of openable", async () => {
    const wrapper = await mountModal({
      supportedProviders: ["WalletConnect", "Neon Wallet", "Google / Email (Web3Auth)"],
      isProviderAvailable: () => false,
      getProviderUnavailableReason: () => "not configured",
    });
    await flushPromises();

    for (const provider of ["WalletConnect", "Neon Wallet", "Google / Email (Web3Auth)"]) {
      const button = wrapper.findAll(".wallet-modal-option").find((b) => b.text().includes(provider));
      expect(button.text()).toContain("not configured");
      expect(button.text()).toContain("header.unavailable");
      expect(button.text()).not.toContain("header.open");
    }
  });

  it("emits connect for WIF when not available (e.g. prod)", async () => {
    const wrapper = await mountModal({
      isProviderAvailable: () => false,
    });
    await flushPromises();
    const wif = wrapper.findAll(".wallet-modal-option").find((b) => b.text().includes("Testnet WIF"));
    await wif.trigger("click");
    expect(wrapper.emitted("connect")).toEqual([["Testnet WIF (Local Dev)"]]);
    // Form should NOT have appeared since the provider isn't available
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
  });

  it("shows the dev-WIF form when WIF provider is available and clicked", async () => {
    const wrapper = await mountModal();
    await flushPromises();
    const wif = wrapper.findAll(".wallet-modal-option").find((b) => b.text().includes("Testnet WIF"));
    await wif.trigger("click");
    await flushPromises();
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    // Connect was NOT emitted yet — only after the user fills the form
    expect(wrapper.emitted("connect")).toBeUndefined();
  });

  it("emits dev-wif-connect with the trimmed wif value on confirm", async () => {
    const wrapper = await mountModal();
    await flushPromises();
    // Open the form
    const wif = wrapper.findAll(".wallet-modal-option").find((b) => b.text().includes("Testnet WIF"));
    await wif.trigger("click");
    await flushPromises();
    // Fill the WIF input
    const input = wrapper.find('input[type="password"]');
    await input.setValue("  LtestWif1234567890  ");
    // Click the connect button
    const confirm = wrapper.findAll("button").find((b) => b.text().includes("header.connectTestnetWif"));
    await confirm.trigger("click");
    expect(wrapper.emitted("dev-wif-connect")).toEqual([["LtestWif1234567890"]]);
  });

  it("does NOT emit dev-wif-connect when input is empty/whitespace", async () => {
    const wrapper = await mountModal();
    await flushPromises();
    const wif = wrapper.findAll(".wallet-modal-option").find((b) => b.text().includes("Testnet WIF"));
    await wif.trigger("click");
    await flushPromises();
    const input = wrapper.find('input[type="password"]');
    await input.setValue("   ");
    const confirm = wrapper.findAll("button").find((b) => b.text().includes("header.connectTestnetWif"));
    await confirm.trigger("click");
    expect(wrapper.emitted("dev-wif-connect")).toBeUndefined();
  });

  it("disables option buttons while walletLoading is true", async () => {
    const wrapper = await mountModal({ walletLoading: true });
    await flushPromises();
    const buttons = wrapper.findAll(".wallet-modal-option");
    for (const b of buttons) {
      expect(b.attributes("disabled")).toBeDefined();
    }
  });
});
