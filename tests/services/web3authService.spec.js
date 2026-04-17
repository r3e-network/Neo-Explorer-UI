import { beforeEach, describe, expect, it, vi } from "vitest";

const envState = vi.hoisted(() => ({ value: "Mainnet" }));
const web3AuthCtorMock = vi.hoisted(() => vi.fn());
const initMock = vi.hoisted(() => vi.fn(async () => {}));
const loginMock = vi.hoisted(() => vi.fn(async () => ({ privKey: "a".repeat(64) })));
const logoutMock = vi.hoisted(() => vi.fn(async () => {}));
const getPrimaryRpcEndpointMock = vi.hoisted(() => vi.fn((env) =>
  String(env || "").toLowerCase().includes("test") ? "https://rpc.testnet.example" : "https://rpc.mainnet.example"
));

vi.mock("@web3auth/auth", () => ({
  Auth: class {
    constructor(options) {
      web3AuthCtorMock(options);
      this.privKey = "";
      this.sessionId = "";
    }

    async init() {
      return initMock();
    }

    async login(params) {
      loginMock(params);
      this.privKey = "a".repeat(64);
      this.sessionId = "session-id";
      return { privKey: this.privKey };
    }

    async logout() {
      this.privKey = "";
      this.sessionId = "";
      return logoutMock();
    }
  },
  LOGIN_PROVIDER: {
    GOOGLE: "google",
    EMAIL_PASSWORDLESS: "email_passwordless",
  },
  UX_MODE: {
    POPUP: "popup",
  },
  THEME_MODES: {
    LIGHT: "light",
    DARK: "dark",
  },
}));

vi.mock("@web3auth/base", () => ({
  CHAIN_NAMESPACES: { OTHER: "OTHER" },
}));

vi.mock("@cityofzion/neon-js", () => {
  const neonMock = {
    Account: class {
      constructor() {
        this.address = "NWeb3AuthTestAddress";
      }
    },
  };
  neonMock.wallet = { Account: neonMock.Account };
  neonMock.default = neonMock;
  return neonMock;
});

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

  it("initializes the popup in explicit dark mode so the auth window matches the wallet flow", async () => {
    const { web3authService } = await import("../../src/services/web3authService.js");

    await web3authService.init();

    expect(web3AuthCtorMock).toHaveBeenCalledTimes(1);
    const constructorOptions = web3AuthCtorMock.mock.calls[0][0];
    expect(constructorOptions.whiteLabel).toBeDefined();
    expect(constructorOptions.uxMode).toBe("popup");
    expect(constructorOptions.mode).toBeUndefined();
    expect(constructorOptions.whiteLabel.mode).toBe("dark");
    expect(constructorOptions.whiteLabel.appName).toBe("Neo Explorer");
  });

  it("uses the current app origin as the block explorer URL", async () => {
    const { web3authService } = await import("../../src/services/web3authService.js");

    await web3authService.init();

    const constructorOptions = web3AuthCtorMock.mock.calls[0][0];
    expect(constructorOptions.redirectUrl).toBe(`${window.location.protocol}//${window.location.host}${window.location.pathname}`);
  });

  it("reinitializes when the explorer network changes so chain config matches the new network", async () => {
    const { web3authService } = await import("../../src/services/web3authService.js");

    await web3authService.init();
    expect(web3AuthCtorMock).toHaveBeenCalledTimes(1);
    expect(web3AuthCtorMock.mock.calls[0][0].sessionNamespace).toBe("Mainnet");

    envState.value = "TestT5";
    await web3authService.init();

    expect(web3AuthCtorMock).toHaveBeenCalledTimes(2);
    expect(web3AuthCtorMock.mock.calls[1][0].sessionNamespace).toBe("TestT5");
  });

  it("connects with the auth adapter using google by default", async () => {
    const { web3authService } = await import("../../src/services/web3authService.js");

    await web3authService.connect();

    expect(loginMock).toHaveBeenCalledWith({ loginProvider: "google" });
  });
});
