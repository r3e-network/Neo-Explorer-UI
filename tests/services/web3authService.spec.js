import { beforeEach, describe, expect, it, vi } from "vitest";

const web3AuthCtorMock = vi.hoisted(() => vi.fn());
const initModalMock = vi.hoisted(() => vi.fn(async () => { }));

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
  getCurrentEnv: () => "Mainnet",
}));

describe("web3authService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("initializes without custom uiConfig theme to avoid whitelabel-only options", async () => {
    const { web3authService } = await import("../../src/services/web3authService.js");

    await web3authService.init();

    expect(web3AuthCtorMock).toHaveBeenCalledTimes(1);
    const constructorOptions = web3AuthCtorMock.mock.calls[0][0];
    expect(constructorOptions.uiConfig).toBeDefined();
  });
});
