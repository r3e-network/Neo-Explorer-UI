import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ContractWriteTab from "@/views/Contract/components/ContractWriteTab.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

const i18nPlugin = {
  install(app) {
    app.config.globalProperties.$t = (key) => key;
  },
};

function mountWriteTab(props = {}) {
  return mount(ContractWriteTab, {
    props: {
      writeMethods: [],
      writeMethodState: [],
      manifest: { abi: { methods: [] } },
      walletConnected: false,
      availableWalletProviders: ["WalletConnect", "Google / Email (Web3Auth)"],
      walletProviderAvailabilityLoaded: true,
      ...props,
    },
    global: {
      plugins: [i18nPlugin],
      stubs: { WalletConnectModal: true, ParamInput: true },
    },
  });
}

describe("ContractWriteTab wallet provider availability", () => {
  it("shows unavailable provider guidance inline while preserving the connect event", async () => {
    const wrapper = mountWriteTab();

    const neoLineButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("NeoLine"));
    const walletConnectButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("WalletConnect"));

    expect(neoLineButton.text()).toContain("header.providerNeoLine");
    expect(neoLineButton.attributes("title")).toBe("header.providerNeoLine");
    expect(neoLineButton.attributes("aria-label")).toBe("NeoLine. header.providerNeoLine");
    const helpId = neoLineButton.attributes("aria-describedby");
    expect(helpId).toMatch(/^contract-write-wallet-provider-help-/);
    expect(wrapper.find(`[id="${helpId}"]`).text()).toBe("header.providerNeoLine");

    expect(walletConnectButton.text()).not.toContain("header.providerWalletConnect");
    expect(walletConnectButton.attributes("aria-describedby")).toBeUndefined();

    await neoLineButton.trigger("click");
    expect(wrapper.emitted("connectWallet")).toEqual([["NeoLine"]]);
  });

  it("offers EVM wallets in the contract write wallet choices when available", async () => {
    const evmProvider = "EVM Wallets (MetaMask, OKX, Rabby, etc.)";
    const wrapper = mountWriteTab({
      availableWalletProviders: ["WalletConnect", "Google / Email (Web3Auth)", evmProvider],
    });

    const evmButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes(evmProvider));

    expect(evmButton).toBeTruthy();
    expect(evmButton.text()).not.toContain("header.providerEvm");
    expect(evmButton.attributes("aria-describedby")).toBeUndefined();

    await evmButton.trigger("click");
    expect(wrapper.emitted("connectWallet")).toEqual([[evmProvider]]);
  });
});
