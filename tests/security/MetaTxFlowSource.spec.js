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
});
