import { beforeEach, describe, expect, it, vi } from "vitest";

const safeRpcMock = vi.hoisted(() => vi.fn());

vi.mock("../../src/services/api.js", () => ({
  safeRpc: safeRpcMock,
  safeRpcList: vi.fn(),
}));

describe("contractService manifest fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("falls back to native getcontractstate when indexed contract lookup misses", async () => {
    const hash = "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd";
    safeRpcMock.mockImplementation(async (method) => {
      if (method === "GetContractByContractHash") return null;
      if (method === "getcontractstate") {
        return {
          hash,
          manifest: {
            name: "NameService",
            abi: {
              methods: [{ name: "register", safe: false }],
              events: [{ name: "Transfer" }],
            },
          },
        };
      }
      return null;
    });

    const { contractService } = await import("../../src/services/contractService.js");
    const manifest = await contractService.getManifest(hash);

    expect(safeRpcMock).toHaveBeenCalledWith(
      "GetContractByContractHash",
      { ContractHash: hash },
      null,
      expect.any(Object)
    );
    expect(safeRpcMock).toHaveBeenCalledWith(
      "getcontractstate",
      [hash],
      null,
      expect.any(Object)
    );
    expect(manifest).toEqual({
      name: "NameService",
      abi: {
        methods: [{ name: "register", safe: false }],
        events: [{ name: "Transfer" }],
      },
    });
  });
});
