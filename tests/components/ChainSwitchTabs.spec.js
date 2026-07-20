import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChainSwitchTabs from "@/components/common/ChainSwitchTabs.vue";
import homeSource from "@/views/Home/HomePage.vue?raw";
import xHomeSource from "@/views/X/XHome.vue?raw";

const routerMock = vi.hoisted(() => ({
  currentRoute: { value: { path: "/homepage" } },
  push: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  getCurrentEnv: vi.fn(),
  setCurrentEnv: vi.fn(),
}));

const neoxEnvMock = vi.hoisted(() => ({
  getNeoxNet: vi.fn(),
  setNeoxNet: vi.fn(),
}));

vi.mock("vue-router", () => ({
  useRouter: () => routerMock,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("@/utils/env", () => ({
  NETWORK_CHANGE_EVENT: "neo-explorer-network-change",
  NETWORK_OPTIONS: [
    { id: "Mainnet", name: "N3 Mainnet" },
    { id: "TestT5", name: "N3 Testnet" },
  ],
  getCurrentEnv: envMock.getCurrentEnv,
  setCurrentEnv: envMock.setCurrentEnv,
}));

vi.mock("@/utils/neoxEnv", () => ({
  NEOX_NETWORK_OPTIONS: [
    { id: "neox-mainnet", name: "Neo X Mainnet", chain: "neox" },
    { id: "neox-testnet", name: "Neo X Testnet", chain: "neox" },
  ],
  getNeoxNet: neoxEnvMock.getNeoxNet,
  setNeoxNet: neoxEnvMock.setNeoxNet,
}));

const wrappers = [];

function mountSwitcher(path = "/homepage") {
  routerMock.currentRoute.value = { path };
  const wrapper = mount(ChainSwitchTabs);
  wrappers.push(wrapper);
  return wrapper;
}

function buttons(wrapper) {
  return wrapper.findAll("button");
}

describe("ChainSwitchTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.currentRoute.value = { path: "/homepage" };
    routerMock.push.mockResolvedValue();
    envMock.getCurrentEnv.mockReturnValue("Mainnet");
    envMock.setCurrentEnv.mockImplementation((env) => env);
    neoxEnvMock.getNeoxNet.mockReturnValue("neox-mainnet");
    neoxEnvMock.setNeoxNet.mockImplementation((net) => net);
  });

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it("keeps the shared switcher on both explorer homepages", () => {
    expect(homeSource).toContain("<ChainSwitchTabs />");
    expect(homeSource).toContain('import ChainSwitchTabs from "@/components/common/ChainSwitchTabs.vue"');
    expect(xHomeSource).toContain("<ChainSwitchTabs />");
    expect(xHomeSource).toContain('import ChainSwitchTabs from "@/components/common/ChainSwitchTabs.vue"');
  });

  it("renders all four networks in a fixed order and highlights N3 Mainnet", () => {
    const wrapper = mountSwitcher();
    const renderedButtons = buttons(wrapper);

    expect(renderedButtons.map((button) => button.text().trim())).toEqual([
      "N3 Mainnet",
      "N3 Testnet",
      "Neo X Mainnet",
      "Neo X Testnet",
    ]);
    expect(renderedButtons.map((button) => button.attributes("aria-pressed"))).toEqual([
      "true",
      "false",
      "false",
      "false",
    ]);
  });

  it("switches from an N3 homepage to the selected Neo X network", async () => {
    const wrapper = mountSwitcher();

    await buttons(wrapper)[3].trigger("click");

    expect(neoxEnvMock.setNeoxNet).toHaveBeenCalledWith("neox-testnet");
    expect(routerMock.push).toHaveBeenCalledWith("/x");
  });

  it("switches from a Neo X homepage to the selected N3 network", async () => {
    const wrapper = mountSwitcher("/x");

    await buttons(wrapper)[1].trigger("click");

    expect(envMock.setCurrentEnv).toHaveBeenCalledWith("TestT5");
    expect(routerMock.push).toHaveBeenCalledWith("/homepage");
  });

  it("synchronizes the active N3 button with external network changes", async () => {
    const wrapper = mountSwitcher();

    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", {
      detail: { env: "TestT5" },
    }));
    await nextTick();

    expect(buttons(wrapper).map((button) => button.attributes("aria-pressed"))).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);
  });

  it("synchronizes the active Neo X button with external network changes", async () => {
    const wrapper = mountSwitcher("/x");

    window.dispatchEvent(new CustomEvent("neo-explorer-network-change", {
      detail: { neoxNet: "neox-testnet" },
    }));
    await nextTick();

    expect(buttons(wrapper).map((button) => button.attributes("aria-pressed"))).toEqual([
      "false",
      "false",
      "false",
      "true",
    ]);
  });
});
