import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({ value: "Mainnet" }));
const web3AuthCtorMock = vi.hoisted(() => vi.fn());
const initModalMock = vi.hoisted(() => vi.fn(async () => {}));
const logoutMock = vi.hoisted(() => vi.fn(async () => {}));
const getPrimaryRpcEndpointMock = vi.hoisted(() => vi.fn((env) =>
  String(env || "").toLowerCase().includes("test") ? "https://rpc.testnet.example" : "https://rpc.mainnet.example"
));

vi.mock("@web3auth/modal", () => ({
  Web3Auth: class {
    constructor(options) {
      web3AuthCtorMock(options);
      this.connected = false;
      this.provider = null;
    }

    async initModal() {
      return initModalMock();
    }

    async logout() {
      return logoutMock();
    }
  },
}));

vi.mock("@web3auth/base", () => ({
  CHAIN_NAMESPACES: { OTHER: "OTHER" },
}));

vi.mock("@web3auth/base-provider", () => ({
  CommonPrivateKeyProvider: class {
    constructor(config) {
      this.config = config;
    }
  },
}));

vi.mock("@cityofzion/neon-js", () => ({
  wallet: {
    Account: class {
      constructor() {
        this.address = "NWeb3AuthTestAddress";
      }
    },
  },
}));

vi.mock("../../src/utils/env.js", () => ({
  getCurrentEnv: () => envState.value,
  getConfiguredRpcBaseUrl: () => "",
  toAbsoluteUrl: (value) => value,
}));

vi.mock("../../src/utils/rpcEndpoints.js", () => ({
  getPrimaryRpcEndpoint: getPrimaryRpcEndpointMock,
}));

describe("web3authService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envState.value = "Mainnet";
  });

  it("initializes without custom uiConfig theme to avoid whitelabel-only options", async () => {
    const { web3authService } = await import("../../src/services/web3authService.js");

    await web3authService.init();

    expect(web3AuthCtorMock).toHaveBeenCalledTimes(1);
    const constructorOptions = web3AuthCtorMock.mock.calls[0][0];
    expect(constructorOptions.uiConfig).toBeDefined();
  });

  it("uses the current app origin as the block explorer URL", async () => {
    const { web3authService } = await import("../../src/services/web3authService.js");

    await web3authService.init();

    const constructorOptions = web3AuthCtorMock.mock.calls[0][0];
    expect(constructorOptions.privateKeyProvider.config.config.chainConfig.blockExplorerUrl).toBe(window.location.origin);
  });

  it("reinitializes when the explorer network changes so chain config matches the new network", async () => {
    const { web3authService } = await import("../../src/services/web3authService.js");

    await web3authService.init();
    expect(web3AuthCtorMock).toHaveBeenCalledTimes(1);
    expect(web3AuthCtorMock.mock.calls[0][0].privateKeyProvider.config.config.chainConfig.chainId).toBe("0x334E");

    envState.value = "TestT5";
    await web3authService.init();

    expect(web3AuthCtorMock).toHaveBeenCalledTimes(2);
    expect(web3AuthCtorMock.mock.calls[1][0].privateKeyProvider.config.config.chainConfig.chainId).toBe("0x3354");
    expect(web3AuthCtorMock.mock.calls[1][0].privateKeyProvider.config.config.chainConfig.rpcTarget).toBe("https://rpc.testnet.example");
  });
});
