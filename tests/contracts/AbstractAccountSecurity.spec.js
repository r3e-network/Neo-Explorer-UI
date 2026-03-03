import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const contractDir = path.resolve(process.cwd(), "contracts/AbstractAccount");
const source = fs
  .readdirSync(contractDir)
  .filter((name) => /^AbstractAccount.*\.cs$/i.test(name))
  .map((name) => fs.readFileSync(path.join(contractDir, name), "utf8"))
  .join("\n");

describe("UnifiedSmartWallet security invariants", () => {
  it("requires signer-backed authorization during account initialization", () => {
    expect(source).toMatch(/AssertBootstrapAuthorization\(/);
    expect(source).toMatch(/CreateAccountInternal\([\s\S]*AssertBootstrapAuthorization\(/);
    expect(source).toMatch(/CheckNativeSignatures\(admins,\s*adminThreshold\)/);
  });

  it("guards execute/meta paths with account-scoped execution lock", () => {
    expect(source).toMatch(/ExecutionLockPrefix/);
    expect(source).toMatch(/EnterExecution\(/);
    expect(source).toMatch(/ExitExecution\(/);
    expect(source).toMatch(/Execute\([\s\S]*EnterExecution\(accountId\)/);
    expect(source).toMatch(/ExecuteMetaTxInternal\([\s\S]*EnterExecution\(accountId\)/);
    expect(source).toMatch(/AssertNoExternalMutationDuringExecution\(/);
  });

  it("does not use wildcard contract permissions in source", () => {
    expect(source).not.toMatch(/\[ContractPermission\("\*"\s*,\s*"\*"\)\]/);
  });

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
    expect(source).toMatch(/Helper\.Concat\(Helper\.Concat\(NoncePrefix,\s*GetStorageKey\(accountId\)\),\s*signer\)/);
  });

  it("stores admin and manager thresholds in completely separate mapping prefixes", () => {
    expect(source).toMatch(/private static readonly byte\[\] AdminThresholdPrefix/);
    expect(source).toMatch(/private static readonly byte\[\] ManagerThresholdPrefix/);
    expect(source).toMatch(/new StorageMap\(Storage\.CurrentContext,\s*AdminThresholdPrefix\)/);
    expect(source).toMatch(/new StorageMap\(Storage\.CurrentContext,\s*ManagerThresholdPrefix\)/);
    expect(source).toMatch(/public static int GetAdminThreshold/);
    expect(source).toMatch(/public static int GetManagerThreshold/);
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
    expect(source).toMatch(/NormalizeDeadlineToMs\(deadline\)/);
    expect(source).toMatch(/ExecutionEngine\.Assert\(\(BigInteger\)Runtime\.Time <= normalizedDeadline,\s*"Signature expired"\)/);
    expect(source).toMatch(/ToBytes32\(argsHash,\s*"Invalid args hash length"\)/);
    expect(source).toMatch(/byte\[] expectedArgsHash = \(byte\[\]\)ComputeArgsHash\(args\)/);
    expect(source).toMatch(/BuildMetaTxStructHash\(accountId,\s*targetContract,\s*method,\s*expectedArgsHash,\s*nonce,\s*deadline\)/);
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
