import { describe, it, expect, vi } from "vitest";
import { buildAddChainParams, addNeoxChainToWallet, isUserRejection } from "../../src/utils/neoxWallet.js";

describe("neoxWallet buildAddChainParams", () => {
  it("builds EIP-3085 params for mainnet", () => {
    const params = buildAddChainParams("neox-mainnet");
    expect(params).toEqual({
      chainId: "0xba93",
      chainName: "Neo X Mainnet",
      nativeCurrency: { name: "GAS", symbol: "GAS", decimals: 18 },
      rpcUrls: ["https://mainnet-1.rpc.banelabs.org", "https://mainnet-2.rpc.banelabs.org"],
      blockExplorerUrls: ["https://xexplorer.neo.org"],
    });
  });

  it("builds testnet params with the T4 chain id", () => {
    const params = buildAddChainParams("neox-testnet");
    expect(params.chainId).toBe("0xba9304");
    expect(parseInt(params.chainId, 16)).toBe(12227332);
    expect(params.blockExplorerUrls).toEqual(["https://xt4scan.ngd.network"]);
    expect(params.rpcUrls.length).toBeGreaterThan(0);
  });
});

describe("neoxWallet addNeoxChainToWallet", () => {
  it("switches directly when the wallet already knows the chain", async () => {
    const provider = { request: vi.fn().mockResolvedValue(null) };
    const outcome = await addNeoxChainToWallet("neox-mainnet", provider);
    expect(outcome).toBe("switched");
    expect(provider.request).toHaveBeenCalledTimes(1);
    expect(provider.request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xba93" }],
    });
  });

  it("falls back to wallet_addEthereumChain on error 4902", async () => {
    const provider = {
      request: vi
        .fn()
        .mockRejectedValueOnce({ code: 4902, message: "Unrecognized chain ID" })
        .mockResolvedValueOnce(null),
    };
    const outcome = await addNeoxChainToWallet("neox-testnet", provider);
    expect(outcome).toBe("added");
    expect(provider.request).toHaveBeenCalledTimes(2);
    const addCall = provider.request.mock.calls[1][0];
    expect(addCall.method).toBe("wallet_addEthereumChain");
    expect(addCall.params[0].chainId).toBe("0xba9304");
    expect(addCall.params[0].nativeCurrency.decimals).toBe(18);
  });

  it("recognizes the tunneled 4902 shape some wallets return", async () => {
    const provider = {
      request: vi
        .fn()
        .mockRejectedValueOnce({ code: -32603, data: { originalError: { code: 4902 } } })
        .mockResolvedValueOnce(null),
    };
    await expect(addNeoxChainToWallet("neox-mainnet", provider)).resolves.toBe("added");
  });

  it("propagates user rejection without attempting to add", async () => {
    const rejection = { code: 4001, message: "User rejected the request." };
    const provider = { request: vi.fn().mockRejectedValue(rejection) };
    await expect(addNeoxChainToWallet("neox-mainnet", provider)).rejects.toEqual(rejection);
    expect(provider.request).toHaveBeenCalledTimes(1);
    expect(isUserRejection(rejection)).toBe(true);
  });

  it("throws NO_EVM_WALLET when no provider is injected", async () => {
    await expect(addNeoxChainToWallet("neox-mainnet", null)).rejects.toMatchObject({ code: "NO_EVM_WALLET" });
  });
});
