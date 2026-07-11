import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  panicHook: vi.fn(),
}));

vi.mock("neo-decompiler-web", () => ({
  createNeoDecompilerClient: mocks.createClient,
}));

import {
  NEO_DECOMPILER_WEB_VERSION,
  createNeoDecompilerWebClient,
  getNeoDecompilerAssetUrls,
} from "@/utils/neoDecompilerWebClient";

describe("neoDecompilerWebClient", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
    mocks.panicHook.mockReset();
    mocks.createClient.mockReturnValue({ initPanicHook: mocks.panicHook });
  });

  it("keeps the runtime asset version aligned with the installed package", () => {
    const packageJson = JSON.parse(readFileSync("node_modules/neo-decompiler-web/package.json", "utf8"));
    expect(NEO_DECOMPILER_WEB_VERSION).toBe(packageJson.version);
  });

  it("uses versioned module and wasm URLs and retries a transient module failure", async () => {
    const wasmInit = vi.fn().mockResolvedValue(undefined);
    const bindings = {
      default: wasmInit,
      infoReport: vi.fn(),
      disasmReport: vi.fn(),
      decompileReport: vi.fn(),
      initPanicHook: vi.fn(),
    };
    const importModule = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
      .mockResolvedValueOnce(bindings);

    await createNeoDecompilerWebClient({ importModule, retryDelayMs: 0 });

    expect(importModule).toHaveBeenCalledTimes(2);
    expect(importModule.mock.calls[0][0]).toContain(`v=${NEO_DECOMPILER_WEB_VERSION}`);
    expect(importModule.mock.calls[0][0]).toContain("attempt=0");
    expect(importModule.mock.calls[1][0]).toContain("attempt=1");
    expect(wasmInit).toHaveBeenCalledWith({
      module_or_path: expect.stringContaining(`v=${NEO_DECOMPILER_WEB_VERSION}`),
    });
    expect(wasmInit).toHaveBeenCalledWith({
      module_or_path: expect.stringContaining("attempt=1"),
    });
    expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({
      decompileReport: bindings.decompileReport,
    }));
    expect(mocks.panicHook).toHaveBeenCalledTimes(1);
  });

  it("returns stable root-relative asset paths", () => {
    expect(getNeoDecompilerAssetUrls(0)).toEqual({
      moduleUrl: `/assets/pkg/neo_decompiler-${NEO_DECOMPILER_WEB_VERSION}.js?v=${NEO_DECOMPILER_WEB_VERSION}&attempt=0`,
      wasmUrl: `/assets/pkg/neo_decompiler_bg-${NEO_DECOMPILER_WEB_VERSION}.wasm?v=${NEO_DECOMPILER_WEB_VERSION}&attempt=0`,
    });
  });
});
