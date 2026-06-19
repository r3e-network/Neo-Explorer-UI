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

  it("renders a structured transaction simulation failure panel for write methods", () => {
    const wrapper = mountWriteTab({
      walletConnected: true,
      walletAccount: { address: "Nabc" },
      walletProvider: "NeoLine",
      writeMethods: [{ name: "transfer", parameters: [] }],
      writeMethodState: [
        {
          open: true,
          params: [],
          loading: false,
          result: undefined,
          gasEstimate: null,
          estimating: false,
          error: "Simulation failed: insufficient GAS",
          simulation: {
            ok: false,
            severity: "error",
            title: "Simulation failed before wallet signing",
            summary: "Simulation failed: insufficient GAS",
            action: "Check the sender balance and transfer amount, then try again.",
            state: "FAULT",
            gasConsumed: "42",
            category: "balance",
            details: "insufficient GAS",
          },
        },
      ],
    });

    const panel = wrapper.get('[data-test="write-simulation-panel"]');
    expect(panel.text()).toContain("Simulation failed before wallet signing");
    expect(panel.text()).toContain("Simulation failed: insufficient GAS");
    expect(panel.text()).toContain("Check the sender balance and transfer amount");
    expect(panel.text()).toContain("FAULT");
    expect(panel.text()).toContain("42");
    expect(wrapper.text()).not.toContain("contractDetail.writeSimulationNoDetails");
  });
});
