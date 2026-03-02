import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const contractPath = path.resolve(process.cwd(), "contracts/AbstractAccount/AbstractAccount.cs");
const source = fs.readFileSync(contractPath, "utf8");

describe("UnifiedSmartWallet security invariants", () => {
  it("binds MetaTx admin context to account scope and self-call origin", () => {
    expect(source).toMatch(/MetaTxContextPrefix/);
    expect(source).toMatch(/StorageMap\s+map\s*=\s*new StorageMap\(Storage\.CurrentContext,\s*MetaTxContextPrefix\)/);
    expect(source).toMatch(/Runtime\.CallingScriptHash == Runtime\.ExecutingScriptHash/);
  });

  it("includes network domain separation in signed payload", () => {
    expect(source).toMatch(/Runtime\.GetNetwork\(\)/);
    expect(source).toMatch(/BuildDomainSeparator\(/);
    expect(source).toMatch(/verifyingContract/);
  });

  it("uses account-scoped nonce storage keys", () => {
    expect(source).toMatch(/Helper\.Concat\(Helper\.Concat\(NoncePrefix,\s*accountId\),\s*signer\)/);
  });

  it("defends multisig thresholds against duplicate role entries", () => {
    expect(source).toMatch(/private static void AssertUniqueAccounts\(/);
    expect(source).toMatch(/AssertUniqueAccounts\(admins\)/);
    expect(source).toMatch(/AssertUniqueAccounts\(managers\)/);
  });

  it("implements strict EIP-712/Keccak verification primitives", () => {
    expect(source).toMatch(/ComputeArgsHash\(/);
    expect(source).toMatch(/CryptoLib\.Keccak256\(/);
    expect(source).toMatch(/NamedCurveHash\.secp256k1Keccak256/);
  });

  it("binds meta-transactions with signed args hash and deadline", () => {
    expect(source).toMatch(/ExecutionEngine\.Assert\(Runtime\.Time <= \(ulong\)deadline,\s*"Signature expired"\)/);
    expect(source).toMatch(/ExecutionEngine\.Assert\(ByteArrayEquals\(expectedArgsHash,\s*providedArgsHash\),\s*"Invalid args hash"\)/);
  });

  it("removes accountId self-signed bypass from explicit signer checks", () => {
    expect(source).not.toMatch(/isSelfSigned/);
    expect(source).toMatch(/CheckExplicitSignatures\(GetAdmins\(accountId\),\s*GetAdminThreshold\(accountId\),\s*verifiedSigners\)/);
    expect(source).toMatch(/CheckExplicitSignatures\(GetManagers\(accountId\),\s*GetManagerThreshold\(accountId\),\s*verifiedSigners\)/);
  });

  it("enforces account existence before sensitive operations", () => {
    expect(source).toMatch(/private static void AssertAccountExists\(/);
    expect(source).toMatch(/AssertAccountExists\(accountId\);/);
  });

  it("exposes account address binding and address-first execution surfaces", () => {
    expect(source).toMatch(/AccountAddressToIdPrefix/);
    expect(source).toMatch(/AccountIdToAddressPrefix/);
    expect(source).toMatch(/public static void CreateAccountWithAddress\(/);
    expect(source).toMatch(/public static void BindAccountAddress\(/);
    expect(source).toMatch(/public static ByteString GetAccountIdByAddress\(/);
    expect(source).toMatch(/public static BigInteger GetNonceForAddress\(/);
    expect(source).toMatch(/public static object ExecuteMetaTxByAddress\(/);
  });
});
