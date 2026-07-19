import { describe, it, expect } from "vitest";
import {
  toBase64Utf8,
  sanitizeZipPath,
  contractBaseName,
  flattenSources,
  contractFiles,
  buildRemixUrl,
} from "../../src/utils/contractExport.js";

describe("contractExport toBase64Utf8", () => {
  it("encodes ascii and non-latin1 content", () => {
    expect(toBase64Utf8("pragma")).toBe(Buffer.from("pragma", "utf8").toString("base64"));
    expect(toBase64Utf8("注释 émoji ✓")).toBe(Buffer.from("注释 émoji ✓", "utf8").toString("base64"));
  });
});

describe("contractExport sanitizeZipPath", () => {
  it("keeps relative paths and strips traversal segments", () => {
    expect(sanitizeZipPath("contracts/WGAS10.sol")).toBe("contracts/WGAS10.sol");
    expect(sanitizeZipPath("/abs/../interfaces/IWGAS10.sol")).toBe("abs/interfaces/IWGAS10.sol");
    expect(sanitizeZipPath("..\\..\\evil.sol")).toBe("evil.sol");
    expect(sanitizeZipPath("", "Fallback.sol")).toBe("Fallback.sol");
  });
});

describe("contractExport contractBaseName", () => {
  it("extracts the file stem", () => {
    expect(contractBaseName("contracts/WGAS10.sol")).toBe("WGAS10");
    expect(contractBaseName("Token.vy")).toBe("Token");
    expect(contractBaseName("", "contract")).toBe("contract");
  });
});

describe("contractExport flattenSources", () => {
  const dep = {
    path: "interfaces/IThing.sol",
    content: "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\ninterface IThing { function x() external; }",
  };
  const main = {
    path: "contracts/Thing.sol",
    content:
      '// SPDX-License-Identifier: GPL-3.0\npragma solidity ^0.8.0;\nimport "../interfaces/IThing.sol";\nimport {A} from "./A.sol";\ncontract Thing is IThing { function x() external {} }',
  };

  it("returns single files untouched", () => {
    expect(flattenSources([main])).toBe(main.content);
  });

  it("concatenates dependency-first with file banners", () => {
    const out = flattenSources([dep, main]);
    const depIdx = out.indexOf("// File: interfaces/IThing.sol");
    const mainIdx = out.indexOf("// File: contracts/Thing.sol");
    expect(depIdx).toBeGreaterThan(-1);
    expect(mainIdx).toBeGreaterThan(depIdx);
  });

  it("comments out all imports and duplicate SPDX identifiers", () => {
    const out = flattenSources([dep, main]);
    expect(out).toContain('// import "../interfaces/IThing.sol";');
    expect(out).toContain('// import {A} from "./A.sol";');
    // exactly one active SPDX line survives
    const active = out.split("\n").filter((l) => /^\s*\/\/\s*SPDX/i.test(l) === false && /SPDX-License-Identifier/.test(l));
    expect(active).toHaveLength(1);
    expect(out).toContain("// // SPDX-License-Identifier: GPL-3.0");
  });

  it("handles empty input", () => {
    expect(flattenSources([])).toBe("");
    expect(flattenSources([{ path: "a.sol", content: "   " }])).toBe("");
  });
});

describe("contractExport contractFiles", () => {
  it("orders additional sources before the main file", () => {
    const files = contractFiles({
      name: "Thing",
      file_path: "contracts/Thing.sol",
      source_code: "contract Thing {}",
      additional_sources: [{ file_path: "interfaces/IThing.sol", source_code: "interface IThing {}" }],
    });
    expect(files.map((f) => f.path)).toEqual(["interfaces/IThing.sol", "contracts/Thing.sol"]);
  });

  it("falls back to the contract name for a missing main path", () => {
    const files = contractFiles({ name: "WGAS10", source_code: "contract WGAS10 {}" });
    expect(files).toEqual([{ path: "WGAS10.sol", content: "contract WGAS10 {}" }]);
  });

  it("returns empty for null/unverified payloads", () => {
    expect(contractFiles(null)).toEqual([]);
    expect(contractFiles({})).toEqual([]);
  });
});

describe("contractExport buildRemixUrl", () => {
  it("encodes a single-file contract verbatim", () => {
    const url = buildRemixUrl({ file_path: "T.sol", source_code: "pragma solidity ^0.8.0; contract T {}" });
    expect(url.startsWith("https://remix.ethereum.org/?#code=")).toBe(true);
    const b64 = url.split("#code=")[1];
    expect(Buffer.from(b64, "base64").toString("utf8")).toBe("pragma solidity ^0.8.0; contract T {}");
  });

  it("flattens multi-file contracts into the link", () => {
    const url = buildRemixUrl({
      file_path: "contracts/Thing.sol",
      source_code: 'import "./IThing.sol";\ncontract Thing {}',
      additional_sources: [{ file_path: "IThing.sol", source_code: "interface IThing {}" }],
    });
    const decoded = Buffer.from(url.split("#code=")[1], "base64").toString("utf8");
    expect(decoded).toContain("// File: IThing.sol");
    expect(decoded).toContain('// import "./IThing.sol";');
  });

  it("returns null when there is no source or it exceeds the size guard", () => {
    expect(buildRemixUrl(null)).toBeNull();
    expect(buildRemixUrl({})).toBeNull();
    expect(buildRemixUrl({ file_path: "T.sol", source_code: "x".repeat(800 * 1024) })).toBeNull();
  });
});
