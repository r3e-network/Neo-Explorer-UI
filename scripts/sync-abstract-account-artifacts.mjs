import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const nefPath = path.resolve(repoRoot, "contracts/AbstractAccount/bin/sc/UnifiedSmartWallet.nef");
const manifestPath = path.resolve(repoRoot, "contracts/AbstractAccount/bin/sc/UnifiedSmartWallet.manifest.json");
const outputPath = path.resolve(repoRoot, "src/constants/abstractAccountArtifacts.js");

const nefBase64 = fs.readFileSync(nefPath).toString("base64");
const manifestObj = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestString = JSON.stringify(manifestObj);

const output = `// Generated from contracts/AbstractAccount/bin/sc artifacts.
// Keep this file in sync with contract rebuilds.

export const ABSTRACT_ACCOUNT_NEF_BASE64 = "${nefBase64}";
export const ABSTRACT_ACCOUNT_MANIFEST_STRING = ${JSON.stringify(manifestString)};
`;

fs.writeFileSync(outputPath, output);
console.log(`Synced abstract account artifacts -> ${outputPath}`);
