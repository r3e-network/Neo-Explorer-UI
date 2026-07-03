import { describe, expect, it, vi } from "vitest";
import { fetchExternalContractSource, getManifestSourceUrl, languageFromFilename } from "@/utils/contractSource";

describe("contractSource", () => {
  it("extracts safe source URLs from common manifest extra keys", () => {
    expect(
      getManifestSourceUrl({
        extra: {
          Source: "https://github.com/r3e-network/sample-contract",
        },
      }),
    ).toBe("https://github.com/r3e-network/sample-contract");

    expect(
      getManifestSourceUrl({
        extra: JSON.stringify({
          sourceCode: "https://raw.githubusercontent.com/r3e-network/sample-contract/main/Contract.cs",
        }),
      }),
    ).toBe("https://raw.githubusercontent.com/r3e-network/sample-contract/main/Contract.cs");

    expect(getManifestSourceUrl({ extra: { Source: "javascript:alert(1)" } })).toBe("");
  });

  it("loads GitHub blob source URLs through raw.githubusercontent.com", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      url: "https://raw.githubusercontent.com/r3e-network/sample-contract/main/Contract.cs",
      headers: {
        get(name) {
          return name.toLowerCase() === "content-length" ? "22" : "text/plain";
        },
      },
      text: () => Promise.resolve("public class Contract {}"),
    });

    const files = await fetchExternalContractSource(
      "https://github.com/r3e-network/sample-contract/blob/main/Contract.cs",
      { fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/r3e-network/sample-contract/main/Contract.cs",
      expect.any(Object),
    );
    expect(files).toEqual([
      expect.objectContaining({
        filename: "Contract.cs",
        language: "csharp",
        code: "public class Contract {}",
      }),
    ]);
  });

  it("detects common source languages from filenames", () => {
    expect(languageFromFilename("Contract.cs")).toBe("csharp");
    expect(languageFromFilename("manifest.json")).toBe("json");
    expect(languageFromFilename("contract.py")).toBe("python");
  });
});
