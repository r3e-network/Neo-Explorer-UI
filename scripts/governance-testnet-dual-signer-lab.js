/**
 * Dual-Signer Governance Testnet Validation
 *
 * Tests the dual-signer pattern where:
 *   - Signer 0: fee-payer (the council WIF) — pays tx fees, witness pre-signed at creation
 *   - Signer 1: committee multisig (11-of-21) — satisfies AssertCommittee, witness assembled from collected sigs
 *
 * Steps:
 *   1. Compile and deploy MockPolicyLab + MockNeoTokenLab
 *   2. Generate 21 committee accounts, build 11-of-21 multisig
 *   3. Fund fee-payer (no need to fund multisig — fee-payer covers fees)
 *   4. Build dual-signer tx: [fee-payer, committee-multisig]
 *   5. Pre-sign fee-payer witness at creation time
 *   6. Collect 11 committee signatures
 *   7. Assemble both witnesses and broadcast
 *   8. Verify on-chain state changed
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const neon = require("@cityofzion/neon-js");

const DEFAULT_RPC_URL = "https://api.n3index.dev/testnet";
const THRESHOLD = 11;
const COMMITTEE_SIZE = 21;
const MILLISECONDS_PER_BLOCK = 3000;
const GAS_PER_BLOCK = 100000000;
const CONTRACT_MANAGEMENT_HASH = "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd";
const GAS_TOKEN = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const DEFAULT_DEPLOY_NETWORK_FEE_RAW = 100000000n;

function readEnvFile(file) {
  const result = {};
  if (!fs.existsSync(file)) return result;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function getEnv(localEnv, key, fallback = "") {
  return (process.env[key] || "").trim() || (localEnv[key] || "").trim() || fallback;
}

async function poll(fn, predicate, attempts = 60, intervalMs = 3000) {
  for (let i = 0; i < attempts; i++) {
    const result = await fn();
    if (predicate(result)) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Poll timeout");
}

function compileContract(projectFile, outputDir, baseName) {
  execFileSync(path.join(process.env.HOME || "", ".dotnet", "tools", "nccs"), [
    projectFile, "-o", outputDir, "--base-name", baseName, "--assembly", "--generate-artifacts=All", "--optimize=All",
  ], { cwd: process.cwd(), stdio: "inherit" });
}

function buildDummyMultisigWitness(multisigAccount, threshold) {
  const builder = new neon.sc.ScriptBuilder();
  for (let i = 0; i < threshold; i++) builder.emitPush(neon.u.HexString.fromHex("00".repeat(64)));
  return new neon.tx.Witness({
    invocationScript: builder.build(),
    verificationScript: neon.u.base642hex(multisigAccount.contract.script),
  });
}

function buildDummySingleWitness(account) {
  return new neon.tx.Witness({
    invocationScript: new neon.sc.ScriptBuilder().emitPush(neon.u.HexString.fromHex("00".repeat(64))).build(),
    verificationScript: account.contract.script.startsWith("0c21")
      ? account.contract.script
      : neon.u.base642hex(account.contract.script),
  });
}

function decodeContractHashFromDeployStack(appLog) {
  const stack = appLog?.executions?.[0]?.stack;
  const values = Array.isArray(stack?.[0]?.value) ? stack[0].value : null;
  const hashItem = values?.[2];
  const rawBase64 = typeof hashItem?.value === "string" ? hashItem.value : "";
  if (!rawBase64) return null;
  const rawHex = Buffer.from(rawBase64, "base64").toString("hex");
  if (!rawHex || rawHex.length !== 40) return null;
  return `0x${Buffer.from(rawHex, "hex").reverse().toString("hex")}`;
}

async function deployContract({ rpcClient, deployerAccount, ownerScriptHash, magic, artifactsDir, baseName }) {
  const nefBuffer = fs.readFileSync(path.resolve(process.cwd(), artifactsDir, `${baseName}.nef`));
  const nefObject = neon.sc.NEF.fromBuffer(nefBuffer);
  const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), artifactsDir, `${baseName}.manifest.json`), "utf8"));
  manifest.name = `${baseName}_${Date.now()}`;

  const script = neon.sc.createScript({
    scriptHash: CONTRACT_MANAGEMENT_HASH,
    operation: "deploy",
    args: [
      neon.sc.ContractParam.byteArray(neon.u.HexString.fromHex(nefBuffer.toString("hex"), true)),
      neon.sc.ContractParam.string(JSON.stringify(manifest)),
      neon.sc.ContractParam.hash160(ownerScriptHash),
    ],
  });

  const height = await rpcClient.getBlockCount();
  const signers = [{ account: deployerAccount.scriptHash, scopes: neon.tx.WitnessScope.Global }];
  const invokeRes = await rpcClient.invokeScript(neon.u.HexString.fromHex(script), signers);
  if (invokeRes.state === "FAULT") throw new Error(`Deploy fault: ${invokeRes.exception}`);

  let tx = new neon.tx.Transaction({ signers, validUntilBlock: height + 1000, script, systemFee: invokeRes.gasconsumed, networkFee: 0 });
  tx.sign(deployerAccount, magic);
  let networkFee;
  try { networkFee = await rpcClient.calculateNetworkFee(tx); } catch { networkFee = DEFAULT_DEPLOY_NETWORK_FEE_RAW.toString(); }

  tx = new neon.tx.Transaction({ signers, validUntilBlock: height + 1000, script, systemFee: invokeRes.gasconsumed, networkFee });
  tx.sign(deployerAccount, magic);
  const txid = await rpcClient.sendRawTransaction(tx);

  const appLog = await poll(
    () => rpcClient.getApplicationLog(txid).catch(() => null),
    (res) => !!res?.executions?.length
  );
  const contractHash = decodeContractHashFromDeployStack(appLog) ||
    neon.experimental.getContractHash(deployerAccount.scriptHash, nefObject.checksum, manifest.name);

  console.log(`  Deployed ${baseName}: ${contractHash} (${txid})`);
  return { txid, contractHash };
}

async function invokeGetter(rpcClient, contractHash, operation) {
  const res = await rpcClient.execute(new neon.rpc.Query({ method: "invokefunction", params: [contractHash, operation, []] }));
  return res?.stack?.[0]?.value ?? null;
}

async function main() {
  const localEnv = readEnvFile(path.join(process.cwd(), ".env"));
  const councilWif = getEnv(localEnv, "TESTNET_COUNCIL_WIF");
  if (!councilWif) throw new Error("Missing TESTNET_COUNCIL_WIF. Set it in .env or environment.");

  const rpcUrl = getEnv(localEnv, "MOCK_POLICY_LAB_RPC_URL", DEFAULT_RPC_URL);
  const rpcClient = new neon.rpc.RPCClient(rpcUrl);
  const feePayer = new neon.wallet.Account(councilWif);
  const version = await rpcClient.execute(new neon.rpc.Query({ method: "getversion" }));
  const magic = Number(version?.protocol?.network);
  if (!Number.isFinite(magic)) throw new Error("Failed to resolve testnet network magic.");

  console.log("=== DUAL-SIGNER GOVERNANCE TESTNET VALIDATION ===");
  console.log(`Fee-payer: ${feePayer.address} (${feePayer.publicKey.slice(0, 16)}...)`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Network magic: ${magic}`);
  console.log("");

  // 1. Generate 21 committee accounts
  console.log("--- Step 1: Generate 21 committee accounts ---");
  const committeeAccounts = Array.from({ length: COMMITTEE_SIZE }, () => new neon.wallet.Account());
  const committeePubkeys = committeeAccounts.map((a) => a.publicKey).sort((a, b) => a.localeCompare(b));
  const multisig = neon.wallet.Account.createMultiSig(THRESHOLD, committeePubkeys);
  const eligibleSigners = committeePubkeys.map((pk) => new neon.wallet.Account(pk).address);

  console.log(`  Committee: ${COMMITTEE_SIZE} accounts generated`);
  console.log(`  Multisig address: ${multisig.address}`);
  console.log(`  Multisig scriptHash: ${multisig.scriptHash}`);
  console.log(`  Threshold: ${THRESHOLD}-of-${COMMITTEE_SIZE}`);
  console.log("");

  // 2. Compile and deploy mock contracts (owner = multisig)
  console.log("--- Step 2: Compile and deploy mock contracts ---");
  compileContract("contracts/MockPolicyLab/MockPolicyLab.csproj", "contracts/MockPolicyLab/bin/sc", "MockPolicyLab");
  compileContract("contracts/MockNeoTokenLab/MockNeoTokenLab.csproj", "contracts/MockNeoTokenLab/bin/sc", "MockNeoTokenLab");

  const policyDeploy = await deployContract({
    rpcClient, deployerAccount: feePayer, ownerScriptHash: multisig.scriptHash, magic,
    artifactsDir: "contracts/MockPolicyLab/bin/sc", baseName: "MockPolicyLab",
  });
  const neoDeploy = await deployContract({
    rpcClient, deployerAccount: feePayer, ownerScriptHash: multisig.scriptHash, magic,
    artifactsDir: "contracts/MockNeoTokenLab/bin/sc", baseName: "MockNeoTokenLab",
  });

  // Verify ownership
  const policyOwner = await poll(() => invokeGetter(rpcClient, policyDeploy.contractHash, "getOwner"), (v) => !!v);
  const neoOwner = await poll(() => invokeGetter(rpcClient, neoDeploy.contractHash, "getOwner"), (v) => !!v);
  console.log(`  MockPolicyLab owner: ${policyOwner}`);
  console.log(`  MockNeoTokenLab owner: ${neoOwner}`);
  console.log("");

  // 3. Build dual-signer governance transaction
  console.log("--- Step 3: Build dual-signer governance transaction ---");
  const invokeScript = neon.sc.createScript(
    {
      scriptHash: policyDeploy.contractHash,
      operation: "setMillisecondsPerBlock",
      args: [neon.sc.ContractParam.integer(MILLISECONDS_PER_BLOCK)],
      callFlags: neon.sc.CallFlags.States | neon.sc.CallFlags.AllowNotify,
    },
    {
      scriptHash: neoDeploy.contractHash,
      operation: "setGasPerBlock",
      args: [neon.sc.ContractParam.integer(GAS_PER_BLOCK)],
      callFlags: neon.sc.CallFlags.States,
    },
  );

  // Dual signers: fee-payer first, committee multisig second
  const dualSigners = [
    { account: feePayer.scriptHash, scopes: neon.tx.WitnessScope.CalledByEntry },
    { account: multisig.scriptHash, scopes: neon.tx.WitnessScope.CalledByEntry },
  ];

  const height = await rpcClient.getBlockCount();
  const invokeRes = await rpcClient.invokeScript(neon.u.HexString.fromHex(invokeScript), dualSigners);
  if (invokeRes.state === "FAULT") throw new Error(`Governance invoke simulation fault: ${invokeRes.exception}`);
  const systemFee = invokeRes.gasconsumed;
  console.log(`  InvokeScript state: ${invokeRes.state}`);
  console.log(`  System fee (gasconsumed): ${systemFee}`);

  // Build probe tx with both dummy witnesses to calculate network fee
  const probeTx = new neon.tx.Transaction({
    signers: dualSigners,
    validUntilBlock: height + 1000,
    script: invokeScript,
    systemFee,
    networkFee: 0,
  });
  probeTx.addWitness(buildDummySingleWitness(feePayer));
  probeTx.addWitness(buildDummyMultisigWitness(multisig, THRESHOLD));
  const networkFee = await rpcClient.calculateNetworkFee(probeTx);
  console.log(`  Network fee: ${networkFee}`);

  // Add 10% buffer to fees (not double — exact is better for testing)
  const finalSystemFee = (BigInt(systemFee) * 11n / 10n).toString();
  const finalNetworkFee = (BigInt(networkFee) * 11n / 10n).toString();
  console.log(`  Final system fee (1.1x): ${finalSystemFee}`);
  console.log(`  Final network fee (1.1x): ${finalNetworkFee}`);

  // Build final unsigned tx
  const finalTx = new neon.tx.Transaction({
    signers: dualSigners,
    validUntilBlock: height + 1000,
    script: invokeScript,
    systemFee: finalSystemFee,
    networkFee: finalNetworkFee,
  });
  const unsignedTxHex = finalTx.serialize(false);
  const txHash = typeof finalTx.hash === "function" ? finalTx.hash() : finalTx.hash;

  console.log(`  TX hash: 0x${txHash}`);
  console.log(`  Unsigned TX size: ${unsignedTxHex.length / 2} bytes`);
  console.log(`  Signers: ${finalTx.signers.length} (fee-payer + committee multisig)`);
  console.log("");

  // 4. Pre-sign fee-payer witness using tx.sign() (the only way neon-js produces correct witnesses)
  console.log("--- Step 4: Pre-sign fee-payer witness ---");
  finalTx.sign(feePayer, magic);
  const signPayload = neon.u.num2hexstring(magic, 4, true) + neon.u.reverseHex(txHash);
  console.log(`  Fee-payer witness attached via tx.sign()`);
  console.log(`  Fee-payer address: ${feePayer.address}`);
  console.log("");

  // 5. Collect 11 committee signatures
  console.log("--- Step 5: Collect 11-of-21 committee signatures ---");
  // Sort committee accounts to match pubkey order for correct CHECKMULTISIG
  const sortedCommitteeAccounts = committeePubkeys.map((pk) =>
    committeeAccounts.find((a) => a.publicKey === pk)
  );
  const signingAccounts = sortedCommitteeAccounts.slice(0, THRESHOLD);
  const committeeSignatures = [];

  for (let i = 0; i < THRESHOLD; i++) {
    const account = signingAccounts[i];
    const sig = neon.wallet.sign(signPayload, account.WIF);
    const verified = neon.wallet.verify(signPayload, sig, account.publicKey);
    committeeSignatures.push(sig);
    console.log(`  Signer ${i + 1}/${THRESHOLD}: ${account.address} | verified: ${verified}`);
    if (!verified) throw new Error(`Committee signature ${i + 1} verification failed!`);
  }
  console.log("");

  // 6. Assemble multisig witness and broadcast
  console.log("--- Step 6: Assemble witnesses and broadcast ---");

  // Fee-payer witness was already attached in step 4 via tx.sign()
  // Now add the committee multisig witness
  const committeeWitness = neon.tx.Witness.buildMultiSig(signPayload, committeeSignatures, multisig);
  finalTx.addWitness(committeeWitness);
  console.log(`  Witnesses attached: ${finalTx.witnesses.length}`);
  console.log(`  Witness 0 (fee-payer): invocation=${finalTx.witnesses[0].invocationScript.toString().length / 2}B, verification=${finalTx.witnesses[0].verificationScript.toString().length / 2}B`);
  console.log(`  Witness 1 (committee): invocation=${committeeWitness.invocationScript.toString().length / 2}B, verification=${committeeWitness.verificationScript.toString().length / 2}B`);

  const broadcastTxid = await rpcClient.sendRawTransaction(finalTx);
  console.log(`  Broadcast txid: ${broadcastTxid}`);
  console.log("");

  // 7. Wait for confirmation and verify on-chain state
  console.log("--- Step 7: Verify on-chain state ---");
  const appLog = await poll(
    () => rpcClient.getApplicationLog(broadcastTxid).catch(() => null),
    (res) => !!res?.executions?.length
  );
  const vmState = appLog?.executions?.[0]?.vmstate || "UNKNOWN";
  const exception = appLog?.executions?.[0]?.exception || null;
  console.log(`  VM state: ${vmState}`);
  if (exception) console.log(`  Exception: ${exception}`);

  if (vmState !== "HALT") throw new Error(`Broadcast failed with VM state: ${vmState}, exception: ${exception}`);

  const storedMs = await poll(
    () => invokeGetter(rpcClient, policyDeploy.contractHash, "getMillisecondsPerBlock"),
    (v) => String(v) === String(MILLISECONDS_PER_BLOCK),
    10, 3000
  );
  const storedGas = await poll(
    () => invokeGetter(rpcClient, neoDeploy.contractHash, "getGasPerBlock"),
    (v) => String(v) === String(GAS_PER_BLOCK),
    10, 3000
  );

  console.log(`  getMillisecondsPerBlock: ${storedMs} (expected: ${MILLISECONDS_PER_BLOCK})`);
  console.log(`  getGasPerBlock: ${storedGas} (expected: ${GAS_PER_BLOCK})`);
  console.log("");

  // 8. Summary
  const success = vmState === "HALT" &&
    String(storedMs) === String(MILLISECONDS_PER_BLOCK) &&
    String(storedGas) === String(GAS_PER_BLOCK);

  console.log("=== RESULT ===");
  console.log(JSON.stringify({
    success,
    dualSignerPattern: true,
    feePayerAddress: feePayer.address,
    feePayerPubkey: feePayer.publicKey,
    multisigAddress: multisig.address,
    multisigScriptHash: multisig.scriptHash,
    committeeSize: COMMITTEE_SIZE,
    threshold: THRESHOLD,
    signaturesCollected: committeeSignatures.length,
    signersInTx: 2,
    witnessesInTx: 2,
    mockPolicyContract: policyDeploy.contractHash,
    mockNeoTokenContract: neoDeploy.contractHash,
    broadcastTxid,
    vmState,
    exception,
    millisecondsPerBlock: storedMs,
    gasPerBlock: storedGas,
    finalSystemFee,
    finalNetworkFee,
    feePayerPaidFees: true,
    multisigHadNoGas: true,
  }, null, 2));

  if (!success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("DUAL_SIGNER_GOVERNANCE_VALIDATION_ERROR");
  console.error(error);
  process.exit(1);
});
