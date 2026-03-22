import { describe, it, expect } from "vitest";
import {
  CSHARP_COMPILER_VERSIONS,
  BOA_COMPILER_VERSIONS,
  requiresCompileCommand,
  resolveUploadNode,
  getCompilerUploadHint,
  getCompilationFailureMessage,
} from "../../src/utils/contractVerification";
import { NET_ENV } from "../../src/utils/env";

describe("contractVerification", () => {
  it("identifies C# compiler versions that require compile command", () => {
    expect(requiresCompileCommand("Neo.Compiler.CSharp 3.0.0")).toBe(true);
    expect(requiresCompileCommand("neo3-boa 0.14.0")).toBe(false);
  });

  it("exposes known C# and boa version lists", () => {
    expect(CSHARP_COMPILER_VERSIONS).toContain("Neo.Compiler.CSharp 3.6.2");
    expect(BOA_COMPILER_VERSIONS).toContain("neo3-boa 0.10.1");
  });

  it("resolves upload endpoint by environment and compiler generation", () => {
    expect(resolveUploadNode("Neo.Compiler.CSharp 3.0.2", NET_ENV.Mainnet)).toBe("https://neofura.ngd.network/upload");
    expect(resolveUploadNode("Neo.Compiler.CSharp 3.6.2", NET_ENV.Mainnet)).toBe(
      "https://mainnet.n3magnet.xyz:3027/upload"
    );
    expect(resolveUploadNode("Neo.Compiler.CSharp 3.0.3", NET_ENV.TestT5)).toBe(
      "https://testmagnet.ngd.network/upload"
    );
    expect(resolveUploadNode("neo3-boa 0.14.0", NET_ENV.TestT5)).toBe("https://n3t5.n3magnet.xyz:3028/upload");
    expect(resolveUploadNode("neo-go", "UnknownEnv")).toBe("");
  });

  it("returns correct upload hint by compiler family", () => {
    expect(getCompilerUploadHint("Neo.Compiler.CSharp 3.6.2")).toContain(".cs");
    expect(getCompilerUploadHint("neo3-boa 0.14.0")).toContain(".py");
    expect(getCompilerUploadHint("neow3j")).toContain(".java");
    expect(getCompilerUploadHint("neo-go")).toContain(".go");
  });

  it("returns correct compile failure message by compiler family", () => {
    expect(getCompilationFailureMessage("Neo.Compiler.CSharp 3.6.2")).toContain(".cs and .csproj");
    expect(getCompilationFailureMessage("neo3-boa 0.14.0")).toContain(".py");
    expect(getCompilationFailureMessage("neow3j")).toContain(".java and .gradle");
    expect(getCompilationFailureMessage("neo-go")).toContain(".go");
  });
});
