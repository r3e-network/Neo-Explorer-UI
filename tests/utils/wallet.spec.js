import { beforeEach, describe, expect, it, vi } from "vitest";
import { addressToScriptHash } from "../../src/utils/neoHelpers.js";
import { normalizeHash160 } from "../../src/utils/walletNormalization.js";

const toast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
};
const walletServiceMock = {
  PROVIDERS: {
    NEOLINE: "NeoLine",
    O3: "O3",
    ONEGATE: "OneGate",
    WALLETCONNECT: "WalletConnect",
    NEON: "Neon Wallet",
    TESTNET_WIF: "Testnet WIF (Local Dev)",
    WEB3AUTH: "Google / Email (Web3Auth)",
  },
  isConnected: false,
  account: null,
  invoke: vi.fn(),
  hydrateSession: vi.fn(),
  connect: vi.fn(),
  restoreSession: vi.fn(),
};

vi.mock("vue-toastification", () => ({
  useToast: () => toast,
}));

vi.mock("@/utils/env", () => ({
  getCurrentEnv: () => "Mainnet",
  NET_ENV: { Mainnet: "Mainnet", TestT5: "TestNet" },
}));

vi.mock("@/services/walletService", () => ({
  walletService: walletServiceMock,
}));

describe("utils/wallet connectWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete window.NEOLine;
    delete window.NEOLineN3;
    delete window.neo3Dapi;
    localStorage.clear();
    sessionStorage.clear();
    walletServiceMock.isConnected = false;
    walletServiceMock.account = null;
    walletServiceMock.invoke.mockReset();
    walletServiceMock.hydrateSession.mockReset();
    walletServiceMock.connect.mockReset();
  });

  it("connects when NeoLineN3 is injected after the ready event", async () => {
    const address = "NdGjgQf6fVfrhL7f4Wq6ZMJ3QY6gW7G6hE";
    const getNetworks = vi.fn().mockResolvedValue({ defaultNetwork: "MainNet" });
    const getAccount = vi.fn().mockResolvedValue({ address });

    window.NEOLine = {};

    const wallet = await import("@/utils/wallet");
    const connection = wallet.connectWallet();

    setTimeout(() => {
      window.NEOLineN3 = {
        Init: function Init() {
          return { getNetworks, getAccount };
        },
      };
      window.dispatchEvent(new Event("NEOLine.NEO.EVENT.READY"));
    }, 25);

    const result = await connection;

    expect(result).toBe(address);
    expect(wallet.connectedAccount.value).toBe(address);
    expect(getAccount).toHaveBeenCalledTimes(1);
  });

  it("connects when NeoLineN3 is injected after the N3 ready event", async () => {
    const address = "NdGjgQf6fVfrhL7f4Wq6ZMJ3QY6gW7G6hE";
    const getNetworks = vi.fn().mockResolvedValue({ defaultNetwork: "MainNet" });
    const getAccount = vi.fn().mockResolvedValue({ address });

    const wallet = await import("@/utils/wallet");
    const connection = wallet.connectWallet();

    setTimeout(() => {
      window.NEOLineN3 = {
        Init: function Init() {
          return { getNetworks, getAccount };
        },
      };
      window.dispatchEvent(new Event("NEOLine.N3.EVENT.READY"));
    }, 25);

    const result = await connection;

    expect(result).toBe(address);
    expect(wallet.connectedAccount.value).toBe(address);
    expect(getAccount).toHaveBeenCalledTimes(1);
  });

  it("rehydrates walletService for a restored NeoLine session", async () => {
    const address = "NdGjgQf6fVfrhL7f4Wq6ZMJ3QY6gW7G6hE";
    const getAccount = vi.fn();
    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return {
          getAccount,
        };
      },
    };
    localStorage.setItem("connectedWallet", address);
    localStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.NEOLINE);

    const wallet = await import("@/utils/wallet");
    await wallet.initWallet();

    expect(wallet.connectedAccount.value).toBe(address);
    expect(getAccount).not.toHaveBeenCalled();
    expect(walletServiceMock.hydrateSession).toHaveBeenCalledWith(
      walletServiceMock.PROVIDERS.NEOLINE,
      { address, label: walletServiceMock.PROVIDERS.NEOLINE }
    );
  });

  it("rehydrates walletService for a restored O3 session", async () => {
    const address = "NQJ6M4QYf9E9oKoR6fT1Y8vL2D8x4oWq8h";
    const getAccount = vi.fn();
    window.neo3Dapi = {
      getAccount,
    };
    localStorage.setItem("connectedWallet", address);
    localStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.O3);

    const wallet = await import("@/utils/wallet");
    await wallet.initWallet();

    expect(wallet.connectedAccount.value).toBe(address);
    expect(getAccount).not.toHaveBeenCalled();
    expect(walletServiceMock.hydrateSession).toHaveBeenCalledWith(
      walletServiceMock.PROVIDERS.O3,
      { address, label: walletServiceMock.PROVIDERS.O3 }
    );
  });

  it("passively restores a stored Web3Auth session without calling interactive connect", async () => {
    const address = "NZ9rkPKcDQqH6bffyYqU6yd5A2cUvuDLUw";
    walletServiceMock.restoreSession.mockResolvedValueOnce({
      address,
      label: walletServiceMock.PROVIDERS.WEB3AUTH,
    });
    localStorage.setItem("connectedWallet", address);
    localStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.WEB3AUTH);

    const wallet = await import("@/utils/wallet");
    await wallet.initWallet();

    expect(walletServiceMock.restoreSession).toHaveBeenCalledWith(walletServiceMock.PROVIDERS.WEB3AUTH);
    expect(walletServiceMock.connect).not.toHaveBeenCalled();
    expect(wallet.connectedAccount.value).toBe(address);
  });

  it("passively hydrates a stored OneGate session without calling interactive account APIs", async () => {
    const address = "NfM3NJFuDtBwZchLh6DYpk1yPigRNmjcTQ";
    window.OneGate = {};
    localStorage.setItem("connectedWallet", address);
    localStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.ONEGATE);

    const wallet = await import("@/utils/wallet");
    await wallet.initWallet();

    expect(wallet.connectedAccount.value).toBe(address);
    expect(walletServiceMock.hydrateSession).toHaveBeenCalledWith(
      walletServiceMock.PROVIDERS.ONEGATE,
      { address, label: walletServiceMock.PROVIDERS.ONEGATE }
    );
  });

  it("clears a stale stored session when NeoLine is unavailable on reload", async () => {
    const staleAddress = "NdGjgQf6fVfrhL7f4Wq6ZMJ3QY6gW7G6hE";
    localStorage.setItem("connectedWallet", staleAddress);
    localStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.NEOLINE);

    const wallet = await import("@/utils/wallet");
    await wallet.initWallet();

    expect(wallet.connectedAccount.value).toBe("");
    expect(localStorage.getItem("connectedWallet")).toBeNull();
    expect(localStorage.getItem("walletProvider")).toBeNull();
  });

  it("clears unsupported WalletConnect sessions on reload instead of leaving stale UI", async () => {
    const staleAddress = "NZ9rkPKcDQqH6bffyYqU6yd5A2cUvuDLUw";
    localStorage.setItem("connectedWallet", staleAddress);
    localStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.WALLETCONNECT);

    const wallet = await import("@/utils/wallet");
    await wallet.initWallet();

    expect(wallet.connectedAccount.value).toBe("");
    expect(localStorage.getItem("connectedWallet")).toBeNull();
    expect(localStorage.getItem("walletProvider")).toBeNull();
  });

  it("restores a stored Neon Wallet session on reload", async () => {
    const address = "NZ9rkPKcDQqH6bffyYqU6yd5A2cUvuDLUw";
    walletServiceMock.restoreSession.mockResolvedValueOnce({
      address,
      label: walletServiceMock.PROVIDERS.NEON,
    });
    localStorage.setItem("connectedWallet", address);
    localStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.NEON);

    const wallet = await import("@/utils/wallet");
    await wallet.initWallet();

    expect(walletServiceMock.restoreSession).toHaveBeenCalledWith(walletServiceMock.PROVIDERS.NEON);
    expect(wallet.connectedAccount.value).toBe(address);
    expect(localStorage.getItem("connectedWallet")).toBe(address);
    expect(localStorage.getItem("walletProvider")).toBe(walletServiceMock.PROVIDERS.NEON);
  });

  it("restores a stored direct testnet WIF session from session storage", async () => {
    const address = "NTestWifAccount111111111111111111111";
    walletServiceMock.restoreSession.mockResolvedValueOnce({
      address,
      label: walletServiceMock.PROVIDERS.TESTNET_WIF,
      persistSession: "session",
    });
    sessionStorage.setItem("connectedWallet", address);
    sessionStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.TESTNET_WIF);
    sessionStorage.setItem("devTestWif", "LtestDirectWif11111111111111111111111111111111111111111111");

    const wallet = await import("@/utils/wallet");
    await wallet.initWallet();

    expect(walletServiceMock.restoreSession).toHaveBeenCalledWith(walletServiceMock.PROVIDERS.TESTNET_WIF, {
      wif: "LtestDirectWif11111111111111111111111111111111111111111111",
    });
    expect(wallet.connectedAccount.value).toBe(address);
    expect(sessionStorage.getItem("connectedWallet")).toBe(address);
  });

  it("does not overwrite connected account from NeoLine focus when active provider is Web3Auth", async () => {
    const neoLineAddress = "NdGjgQf6fVfrhL7f4Wq6ZMJ3QY6gW7G6hE";
    const web3AuthAddress = "NQJ6M4QYf9E9oKoR6fT1Y8vL2D8x4oWq8h";
    const getNetworks = vi.fn().mockResolvedValue({ defaultNetwork: "MainNet" });
    const getAccount = vi.fn().mockResolvedValue({ address: neoLineAddress });

    window.NEOLine = {};
    window.NEOLineN3 = {
      Init: function Init() {
        return { getNetworks, getAccount };
      },
    };

    const wallet = await import("@/utils/wallet");
    await wallet.connectWallet();

    expect(wallet.connectedAccount.value).toBe(neoLineAddress);
    localStorage.setItem("walletProvider", walletServiceMock.PROVIDERS.WEB3AUTH);
    wallet.connectedAccount.value = web3AuthAddress;

    getAccount.mockResolvedValue({ address: "NVXXh9JpVh2xGvW67Xhdq8z9x8xY1vM8qX" });
    window.dispatchEvent(new Event("focus"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wallet.connectedAccount.value).toBe(web3AuthAddress);
  });

  it("shows generic connect-wallet error for vote action when no wallet is connected", async () => {
    const wallet = await import("@/utils/wallet");
    await wallet.voteForCandidate("03c95f8e6fe4f6e9de4dbf67bf3ff47a1465644d0f32956543e12b3d6b0ffb02d7");

    expect(toast.error).toHaveBeenCalledWith("wallet.connectFirst");
    expect(toast.warning).not.toHaveBeenCalledWith("wallet.notFound");
  });

  it("uses script hash args and signer when submitting vote", async () => {
    const voterAddress = "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf";
    const candidatePubkey = "0239a37436652f41b3b802ca44cbcb7d65d3aa0b88c9a0380243bdbe1aaa5cb35b";
    const voterScriptHash = normalizeHash160(addressToScriptHash(voterAddress));

    walletServiceMock.isConnected = true;
    walletServiceMock.account = { address: voterAddress };
    walletServiceMock.invoke.mockResolvedValue({ txid: "0xtestvote" });

    const wallet = await import("@/utils/wallet");
    wallet.connectedAccount.value = voterAddress;

    await wallet.voteForCandidate(candidatePubkey);

    expect(walletServiceMock.invoke).toHaveBeenCalledWith({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "vote",
      args: [
        { type: "Hash160", value: voterScriptHash },
        { type: "PublicKey", value: candidatePubkey },
      ],
      signers: [{ account: voterScriptHash, scopes: 1 }],
      scope: 1,
    });
  });

  it("submits unvote by passing Any/null as the candidate argument", async () => {
    const voterAddress = "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf";
    const voterScriptHash = normalizeHash160(addressToScriptHash(voterAddress));

    walletServiceMock.isConnected = true;
    walletServiceMock.account = { address: voterAddress };
    walletServiceMock.invoke.mockResolvedValue({ txid: "0xtestunvote" });

    const wallet = await import("@/utils/wallet");
    wallet.connectedAccount.value = voterAddress;

    await wallet.unvoteCandidate();

    expect(walletServiceMock.invoke).toHaveBeenCalledWith({
      scriptHash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5",
      operation: "vote",
      args: [
        { type: "Hash160", value: voterScriptHash },
        { type: "Any", value: null },
      ],
      signers: [{ account: voterScriptHash, scopes: 1 }],
      scope: 1,
    });
  });
});
