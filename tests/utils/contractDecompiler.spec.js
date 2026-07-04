import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  webInit: vi.fn(),
  webDecompileReport: vi.fn(),
  webInitPanicHook: vi.fn(),
}));

vi.mock("neo-decompiler-web", () => ({
  init: mocks.webInit,
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

  it("reports a clear error when the web decompiler cannot initialize", async () => {
    mocks.webInit.mockRejectedValueOnce(new Error("missing wasm artifact"));

    const { decompileContractState } = await import("@/utils/contractDecompiler");
    const rawNef = bytesToBase64([0x4e, 0x45, 0x46, 0x33, 0x00]);

    await expect(decompileContractState({ nef: rawNef }, null)).rejects.toThrow("missing wasm artifact");
  });
});
