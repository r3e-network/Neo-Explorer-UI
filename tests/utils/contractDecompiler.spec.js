import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  webInit: vi.fn(),
  webDecompileReport: vi.fn(),
  webInitPanicHook: vi.fn(),
  decompileHighLevelBytesWithManifest: vi.fn(),
  decompileHighLevelBytes: vi.fn(),
}));

vi.mock("neo-decompiler-web", () => ({
  init: mocks.webInit,
}));

vi.mock("neo-decompiler-js", () => ({
  decompileHighLevelBytes: mocks.decompileHighLevelBytes,
  decompileHighLevelBytesWithManifest: mocks.decompileHighLevelBytesWithManifest,
}));

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

describe("contractDecompiler", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.webInit.mockResolvedValue({
      decompileReport: mocks.webDecompileReport,
      initPanicHook: mocks.webInitPanicHook,
    });
  });

  it("rebuilds NEF bytes from chain state script and decompiles with manifest context", async () => {
    mocks.webDecompileReport.mockReturnValueOnce({
      csharp: "contract NeoToken {\n    public static string Symbol() => \"NEO\";\n}",
      warnings: ["lifted"],
    });

    const { decompileContractState } = await import("@/utils/contractDecompiler");
    const manifest = {
      name: "NeoToken",
      abi: {
        methods: [{ name: "symbol", offset: 0, parameters: [], returntype: "String", safe: true }],
      },
    };
    const result = await decompileContractState({
      nef: {
        compiler: "neo-devpack-dotnet",
        source: "",
        script: bytesToBase64([0x11, 0x40]),
        tokens: [],
      },
    }, manifest);

    expect(mocks.webInit).toHaveBeenCalledTimes(1);
    expect(mocks.webInitPanicHook).toHaveBeenCalledTimes(1);
    expect(mocks.webDecompileReport).toHaveBeenCalledTimes(1);
    const [nefBytes, options] = mocks.webDecompileReport.mock.calls[0];
    expect(nefBytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(nefBytes.slice(0, 4))).toBe("NEF3");
    expect(JSON.parse(options.manifestJson)).toEqual(manifest);
    expect(options).toMatchObject({
      failOnUnknownOpcodes: false,
      inlineSingleUseTemps: true,
      outputFormat: "csharp",
      strictManifest: false,
      typedDeclarations: true,
    });
    expect(result.code).toContain("public static string Symbol");
    expect(result.warnings).toEqual(["lifted"]);
  });

  it("falls back to the JS decompiler when the web package cannot initialize", async () => {
    mocks.webInit.mockRejectedValueOnce(new Error("missing wasm artifact"));
    mocks.decompileHighLevelBytes.mockReturnValueOnce({ highLevel: "contract Raw {}", warnings: [] });

    const { decompileContractState } = await import("@/utils/contractDecompiler");
    const rawNef = bytesToBase64([0x4e, 0x45, 0x46, 0x33, 0x00]);
    const result = await decompileContractState({ nef: rawNef }, null);

    expect(mocks.decompileHighLevelBytes).toHaveBeenCalledWith(expect.any(Uint8Array), { clean: true });
    expect(result.code).toBe("contract Raw {}");
    expect(result.warnings).toEqual(["neo-decompiler-web was unavailable; fell back to neo-decompiler-js."]);
  });
});
