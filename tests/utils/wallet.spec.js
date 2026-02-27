import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
};
const walletServiceMock = {
  PROVIDERS: { NEOLINE: "NeoLine" },
  isConnected: false,
  account: null,
  invoke: vi.fn(),
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
    localStorage.clear();
    walletServiceMock.isConnected = false;
    walletServiceMock.account = null;
    walletServiceMock.invoke.mockReset();
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
    localStorage.setItem("walletProvider", "Google / Email (Web3Auth)");
    wallet.connectedAccount.value = web3AuthAddress;

    getAccount.mockResolvedValue({ address: "NVXXh9JpVh2xGvW67Xhdq8z9x8xY1vM8qX" });
    window.dispatchEvent(new Event("focus"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wallet.connectedAccount.value).toBe(web3AuthAddress);
  });

  it("shows generic connect-wallet error for vote action when no wallet is connected", async () => {
    const wallet = await import("@/utils/wallet");
    await wallet.voteForCandidate("03c95f8e6fe4f6e9de4dbf67bf3ff47a1465644d0f32956543e12b3d6b0ffb02d7");

    expect(toast.error).toHaveBeenCalledWith("Please connect your wallet first via the header.");
    expect(toast.warning).not.toHaveBeenCalledWith("NeoLine N3 wallet not found. Please install the extension.");
  });
});
