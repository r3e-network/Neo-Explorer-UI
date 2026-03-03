import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const walletServicePath = path.resolve(process.cwd(), "src/services/walletService.js");
const relayerPath = path.resolve(process.cwd(), "api/relayer.js");

const walletSource = fs.readFileSync(walletServicePath, "utf8");
const relayerSource = fs.readFileSync(relayerPath, "utf8");

describe("MetaTx EIP-712 source invariants", () => {
  it("wallet service uses prepare+execute relayer flow", () => {
    expect(walletSource).toMatch(/action:\s*"prepare"/);
    expect(walletSource).toMatch(/action:\s*"execute"/);
  });

  it("wallet service signs typed data with chain-bound domain fields", () => {
    expect(walletSource).toMatch(/chainId/);
    expect(walletSource).toMatch(/verifyingContract/);
    expect(walletSource).toMatch(/argsHash/);
    expect(walletSource).toMatch(/deadline/);
    expect(walletSource).toMatch(/signerAddress/);
  });

  it("relayer exposes prepare action and returns signing payload", () => {
    expect(relayerSource).toMatch(/if\s*\(normalizedAction\s*===\s*['"]prepare['"]\)/);
    expect(relayerSource).toMatch(/domain/);
    expect(relayerSource).toMatch(/types/);
    expect(relayerSource).toMatch(/message/);
  });

  it("relayer deadlines are unix-seconds bounded windows", () => {
    expect(relayerSource).toMatch(/Math\.floor\(Date\.now\(\)\s*\/\s*1000\)/);
    expect(relayerSource).toMatch(/MAX_DEADLINE_WINDOW_SECONDS/);
    expect(relayerSource).toMatch(/must be in the future/);
  });

  it("relayer enforces configured abstract account hash allowlist", () => {
    expect(relayerSource).toMatch(/getConfiguredAaHash/);
    expect(relayerSource).toMatch(/aaHash is not allowed by relayer policy/);
  });

  it("uses dynamic bytes accountId EIP-712 type to match contract struct", () => {
    expect(relayerSource).toMatch(/name:\s*['"]accountId['"],\s*type:\s*['"]bytes['"]/);
    expect(relayerSource).not.toMatch(/name:\s*['"]accountId['"],\s*type:\s*['"]bytes32['"]/);
  });

  it("uses byte-array accountId for nonce lookup and executeMetaTx contract calls", () => {
    expect(relayerSource).toMatch(/operation:\s*['"]getNonceForAccount['"]/);
    expect(relayerSource).toMatch(/sc\.ContractParam\.byteArray\(/);
    expect(relayerSource).toMatch(/operation:\s*['"]executeMetaTx(ByAddress)?['"]/);
    expect(relayerSource).toMatch(/sc\.ContractParam\.byteArray\([\s\S]*cleanAccountId/);
    expect(relayerSource).toMatch(/assertByteArrayHex\(accountId,\s*'accountId',\s*\{\s*minBytes:\s*1,\s*maxBytes:\s*64\s*\}\)/);
  });

  it("supports accountAddress-first lookup and by-address execution path", () => {
    expect(relayerSource).toMatch(/accountAddress/);
    expect(relayerSource).toMatch(/operation:\s*['"]getAccountIdByAddress['"]/);
    expect(relayerSource).toMatch(/operation:\s*['"]getNonceForAddress['"]/);
    expect(relayerSource).toMatch(/operation:\s*['"]executeMetaTxByAddress['"]/);
    expect(relayerSource).toMatch(/sc\.ContractParam\.hash160\(cleanAccountAddress\)/);
  });

  it("binds nonce namespace to explicit signer address in prepare/execute flow", () => {
    expect(relayerSource).toMatch(/signerAddress/);
    expect(relayerSource).toMatch(/Recovered signer does not match signerAddress/);
  });

  it("wallet service sends accountAddress with relayer prepare/execute payloads", () => {
    expect(walletSource).toMatch(/accountAddress/);
    expect(walletSource).toMatch(/action:\s*"prepare"[\s\S]*accountAddress/);
    expect(walletSource).toMatch(/action:\s*"execute"[\s\S]*accountAddress/);
  });

  it("restricts relayer witness scope to AA contract via CustomContracts", () => {
    expect(relayerSource).toMatch(/tx\.WitnessScope\.CustomContracts/);
    expect(relayerSource).toMatch(/allowedContracts/);
  });
});
