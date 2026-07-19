// Contract source export helpers for the Neo X contract tab: download the
// verified sources (single .sol, or a ZIP for multi-file projects) and build
// "Open in Remix" links (https://remix.ethereum.org/#code=<base64> creates the
// file in the user's Remix workspace).
//
// Remix's #code hash only carries ONE file, so multi-file projects are
// conservatively flattened: dependency files first, main file last, local
// import statements and duplicate SPDX identifiers commented out. That
// compiles for straightforward dependency graphs; the lossless structure is
// always available through the ZIP download.

const REMIX_BASE = "https://remix.ethereum.org/?#code=";
// Fragment size guard — browsers cope with multi-MB URLs, but stay well under
// practical limits so the link never silently truncates.
const REMIX_MAX_SOURCE_BYTES = 750 * 1024;

/** UTF-8-safe base64 (btoa alone throws on non-Latin1 code points). */
export function toBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value ?? ""));
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Keep ZIP entry paths relative and traversal-free.
 * "contracts/WGAS10.sol" stays; "/abs/../x.sol" → "abs/x.sol".
 */
export function sanitizeZipPath(path, fallback = "Contract.sol") {
  const cleaned = String(path || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return cleaned || fallback;
}

/** "contracts/WGAS10.sol" → "WGAS10". */
export function contractBaseName(filePath, fallback = "contract") {
  const last = String(filePath || "").replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
  const stem = last.replace(/\.[^.]+$/, "").trim();
  return stem || fallback;
}

// import "./x.sol";  import {A} from "../y.sol";  import 'contracts/z.sol' as Z;
const IMPORT_LINE = /^\s*import\s[^;]*;\s*$/;
const SPDX_LINE = /^\s*\/\/\s*SPDX-License-Identifier:/i;

/**
 * Conservative single-file flatten for Remix: dependencies first, main last,
 * every file under a "// File: <path>" banner, ALL import statements and every
 * SPDX line after the first commented out.
 *
 * @param {Array<{path: string, content: string}>} files - main file LAST.
 * @returns {string}
 */
export function flattenSources(files) {
  const list = (files || []).filter((f) => f && typeof f.content === "string" && f.content.trim());
  if (list.length === 0) return "";
  if (list.length === 1) return list[0].content;

  let sawSpdx = false;
  const parts = [
    "// Sources flattened for Remix by Neo Explorer — local imports are commented",
    "// out and files are concatenated dependency-first. Download the sources ZIP",
    "// from the explorer for the original file layout.",
    "",
  ];

  for (const file of list) {
    parts.push(`// File: ${file.path || "unknown"}`);
    for (const line of file.content.split("\n")) {
      if (IMPORT_LINE.test(line)) {
        parts.push(`// ${line.trim()}`);
      } else if (SPDX_LINE.test(line)) {
        if (sawSpdx) {
          parts.push(`// ${line.trim()}`);
        } else {
          sawSpdx = true;
          parts.push(line);
        }
      } else {
        parts.push(line);
      }
    }
    parts.push("");
  }
  return parts.join("\n");
}

/**
 * Build the files list for a Blockscout smart-contract payload:
 * additional_sources (dependencies) first, the main source last.
 *
 * @param {Object} contract - raw Blockscout smart-contracts/{hash} payload.
 * @returns {Array<{path: string, content: string}>}
 */
export function contractFiles(contract) {
  if (!contract) return [];
  const files = [];
  for (const extra of Array.isArray(contract.additional_sources) ? contract.additional_sources : []) {
    if (extra?.source_code) {
      files.push({ path: sanitizeZipPath(extra.file_path, "Dependency.sol"), content: extra.source_code });
    }
  }
  if (contract.source_code) {
    files.push({
      path: sanitizeZipPath(contract.file_path, `${contract.name || "Contract"}.sol`),
      content: contract.source_code,
    });
  }
  return files;
}

/**
 * "Open in Remix" URL, or null when there is no source / it exceeds the size
 * guard.
 *
 * @param {Object} contract - raw Blockscout smart-contracts/{hash} payload.
 * @returns {string|null}
 */
export function buildRemixUrl(contract) {
  const files = contractFiles(contract);
  if (files.length === 0) return null;
  const source = files.length === 1 ? files[0].content : flattenSources(files);
  if (!source || new TextEncoder().encode(source).length > REMIX_MAX_SOURCE_BYTES) return null;
  return REMIX_BASE + toBase64Utf8(source);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a beat to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Download the verified sources: a bare .sol for single-file contracts, a ZIP
 * (sources at their original paths + abi.json + metadata.json) otherwise.
 * jszip loads lazily so the main bundle stays untouched.
 *
 * @param {Object} contract - raw Blockscout smart-contracts/{hash} payload.
 * @param {string} [address] - contract address, used in the archive name.
 */
export async function downloadContractSources(contract, address = "") {
  const files = contractFiles(contract);
  if (files.length === 0) return false;

  const baseName = contractBaseName(files[files.length - 1].path, "contract");

  if (files.length === 1 && !contract.abi) {
    triggerBlobDownload(
      new Blob([files[0].content], { type: "text/plain;charset=utf-8" }),
      `${baseName}.sol`,
    );
    return true;
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  if (contract.abi) {
    zip.file("abi.json", JSON.stringify(contract.abi, null, 2));
  }
  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        address: address || undefined,
        name: contract.name || undefined,
        language: contract.language || undefined,
        compiler_version: contract.compiler_version || undefined,
        evm_version: contract.evm_version || undefined,
        optimization_enabled: contract.optimization_enabled ?? undefined,
        optimization_runs: contract.optimization_runs ?? undefined,
        verified_at: contract.verified_at || undefined,
        license_type: contract.license_type || undefined,
      },
      null,
      2,
    ),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const suffix = address ? `-${address.slice(0, 10)}` : "";
  triggerBlobDownload(blob, `${baseName}${suffix}-sources.zip`);
  return true;
}
