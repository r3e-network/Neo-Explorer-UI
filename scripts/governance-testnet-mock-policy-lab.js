const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const neon = require("@cityofzion/neon-js");

const DEFAULT_RPC_URL = "https://api.n3index.dev/testnet";
const DEFAULT_THRESHOLD = 2;
const DEFAULT_SIGNER_COUNT = 3;
const DEFAULT_FUND_AMOUNT_RAW = 3000000n; // 0.03 GAS
const CONTRACT_MANAGEMENT_HASH = "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd";
const GAS_TOKEN = "0xd2a4cff31913016155e38e474a2c06d08be276cf";

function readEnvFile(file) {
  const result = {};
  if (!fs.existsSync(file)) return result;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function getEnvValue(localEnv, key, fallback = "") {
  const direct = process.env[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const local = localEnv[key];
  if (typeof local === "string" && local.trim()) return local.trim();
  return fallback;
}

function isMissingColumnError(error, column) {
  const message = String(error?.message || "");
  return message.includes(`'${column}'`) && /schema cache|column/i.test(message);
}

async function createRequestCompat(supabase, payload) {
  let currentPayload = { ...payload };
  for (;;) {
    const { data, error } = await supabase.from("multisig_requests").insert([currentPayload]).select().single();
    if (!error) return data;
    if (isMissingColumnError(error, "type") && "type" in currentPayload) {
      delete currentPayload.type;
      continue;
    }
    throw error;
  }
}

async function addSignatureCompat(supabase, payload) {
  let currentPayload = { ...payload };
  for (;;) {
    const { data, error } = await supabase.from("multisig_signatures").insert([currentPayload]).select();
    if (!error) return data;
    let removed = false;
    for (const column of ["public_key", "witness", "invocation_script", "verification_script"]) {
      if (isMissingColumnError(error, column) && column in currentPayload) {
        delete currentPayload[column];
        removed = true;
        break;
      }
    }
    if (removed) continue;
    throw error;
  }
}

async function poll(fn, predicate, attempts = 40, intervalMs = 3000) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return last;
}

function compileMockPolicyContract() {
  execFileSync(path.join(process.env.HOME || "", ".dotnet", "tools", "nccs"), [
    "contracts/MockPolicyLab/MockPolicyLab.csproj",
    "-o",
    "contracts/MockPolicyLab/bin/sc",
    "--base-name",
    "MockPolicyLab",
    "--assembly",
    "--generate-artifacts=All",
    "--optimize=All",
  ], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function gasBalanceOf(balanceResult) {
  const item = (balanceResult?.balance || []).find(
    (entry) => String(entry.assethash || "").toLowerCase() === GAS_TOKEN.toLowerCase()
  );
  return item ? BigInt(item.amount) : 0n;
}

function buildDummyMultisigWitness(multisigAccount, threshold) {
  const builder = new neon.sc.ScriptBuilder();
  const dummySig = "00".repeat(64);
  for (let i = 0; i < threshold; i += 1) {
    builder.emitPush(neon.u.HexString.fromHex(dummySig));
  }
  return new neon.tx.Witness({
    invocationScript: builder.build(),
    verificationScript: neon.u.base642hex(multisigAccount.contract.script),
  });
}

function decodeContractHashFromDeployStack(appLog) {
  const stack = appLog?.executions?.[0]?.stack;
  const deployResult = Array.isArray(stack) ? stack[0] : null;
  const values = Array.isArray(deployResult?.value) ? deployResult.value : null;
  const hashItem = values?.[2];
  const rawBase64 = typeof hashItem?.value === "string" ? hashItem.value : "";
  if (!rawBase64) return null;
  const rawHex = Buffer.from(rawBase64, "base64").toString("hex");
  if (!rawHex || rawHex.length !== 40) return null;
  return `0x${Buffer.from(rawHex, "hex").reverse().toString("hex")}`;
}

async function buildAndSendDirectTransfer({ rpcClient, signerAccount, toScriptHash, amountRaw, magic }) {
  const builder = new neon.sc.ScriptBuilder();
  builder.emitAppCall(GAS_TOKEN, "transfer", [
    neon.sc.ContractParam.hash160(signerAccount.scriptHash),
    neon.sc.ContractParam.hash160(toScriptHash),
    neon.sc.ContractParam.integer(Number(amountRaw)),
    neon.sc.ContractParam.any(null),
  ]);

  const script = builder.build();
  const currentHeight = await rpcClient.getBlockCount();
  const signers = [{ account: signerAccount.scriptHash, scopes: neon.tx.WitnessScope.CalledByEntry }];
  const invokeRes = await rpcClient.invokeScript(neon.u.HexString.fromHex(script), signers);
  if (invokeRes.state === "FAULT") {
    throw new Error(`Funding simulation fault: ${invokeRes.exception}`);
  }

  let tx = new neon.tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: invokeRes.gasconsumed || 0,
    networkFee: 0,
  });
  tx.sign(signerAccount, magic);
  const networkFee = await rpcClient.calculateNetworkFee(tx);

  tx = new neon.tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: invokeRes.gasconsumed || 0,
    networkFee,
  });
  tx.sign(signerAccount, magic);

  const txid = await rpcClient.sendRawTransaction(tx);
  return txid;
}

async function estimateMultisigInvokeFees({ rpcClient, multisigAccount, threshold, script }) {
  const currentHeight = await rpcClient.getBlockCount();
  const signers = [{ account: multisigAccount.scriptHash, scopes: neon.tx.WitnessScope.CalledByEntry }];
  const invokeRes = await rpcClient.invokeScript(neon.u.HexString.fromHex(script), signers);
  if (invokeRes.state === "FAULT") {
    throw new Error(`Mock policy multisig simulation fault: ${invokeRes.exception}`);
  }

  const probeTx = new neon.tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: invokeRes.gasconsumed || 0,
    networkFee: 0,
  });
  probeTx.addWitness(buildDummyMultisigWitness(multisigAccount, threshold));
  const networkFeeRaw = BigInt(await rpcClient.calculateNetworkFee(probeTx));

  return {
    currentHeight,
    signers,
    systemFeeRaw: BigInt(invokeRes.gasconsumed || 0),
    networkFeeRaw,
  };
}

async function deployMockPolicyContract({ rpcClient, deployerAccount, ownerScriptHash, magic }) {
  const nefPath = path.resolve(process.cwd(), "contracts/MockPolicyLab/bin/sc/MockPolicyLab.nef");
  const manifestPath = path.resolve(process.cwd(), "contracts/MockPolicyLab/bin/sc/MockPolicyLab.manifest.json");
  const nefBuffer = fs.readFileSync(nefPath);
  const manifestObject = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifestObject.name = `MockPolicyLab_${Date.now()}`;
  const manifestString = JSON.stringify(manifestObject);
  const nefObject = neon.sc.NEF.fromBuffer(nefBuffer);

  const script = neon.sc.createScript({
    scriptHash: CONTRACT_MANAGEMENT_HASH,
    operation: "deploy",
    args: [
      neon.sc.ContractParam.byteArray(nefBuffer.toString("base64")),
      neon.sc.ContractParam.string(manifestString),
      neon.sc.ContractParam.hash160(ownerScriptHash),
    ],
  });

  const currentHeight = await rpcClient.getBlockCount();
  const signers = [{ account: deployerAccount.scriptHash, scopes: neon.tx.WitnessScope.Global }];
  const invokeRes = await rpcClient.invokeScript(neon.u.HexString.fromHex(script), signers);
  if (invokeRes.state === "FAULT") {
    throw new Error(`Deploy simulation fault: ${invokeRes.exception}`);
  }

  let transaction = new neon.tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: invokeRes.gasconsumed || 0,
    networkFee: 0,
  });
  transaction.sign(deployerAccount, magic);
  const networkFee = await rpcClient.calculateNetworkFee(transaction);
  transaction = new neon.tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: invokeRes.gasconsumed || 0,
    networkFee,
  });
  transaction.sign(deployerAccount, magic);
  const deploymentTxid = await rpcClient.sendRawTransaction(transaction);

  const computedContractHash = neon.experimental.getContractHash(
    deployerAccount.scriptHash,
    nefObject.checksum,
    manifestObject.name
  );
  const deploymentLog = await poll(
    async () => {
      try {
        return await rpcClient.getApplicationLog(deploymentTxid);
      } catch (_error) {
        return null;
      }
    },
    (res) => !!res && Array.isArray(res.executions) && res.executions.length > 0
  );
  const chainReportedHash = decodeContractHashFromDeployStack(deploymentLog);
  const contractHash = chainReportedHash || computedContractHash;
  return {
    deploymentTxid,
    contractHash,
    contractName: manifestObject.name,
    computedContractHash,
    chainReportedHash,
  };
}

async function invokeGetter(rpcClient, contractHash, operation) {
  const response = await rpcClient.execute(
    new neon.rpc.Query({
      method: "invokefunction",
      params: [contractHash, operation, []],
    })
  );
  return response?.stack?.[0]?.value ?? null;
}

async function main() {
  const localEnv = readEnvFile(path.join(process.cwd(), ".env"));
  const councilWif = getEnvValue(localEnv, "TESTNET_COUNCIL_WIF");
  if (!councilWif) throw new Error("Missing TESTNET_COUNCIL_WIF.");

  const supabaseUrl = getEnvValue(localEnv, "VITE_SUPABASE_URL", getEnvValue(localEnv, "SUPABASE_URL"));
  const supabaseAnonKey = getEnvValue(localEnv, "VITE_SUPABASE_ANON_KEY", getEnvValue(localEnv, "SUPABASE_ANON_KEY"));
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase URL or anon key.");

  const rpcUrl = getEnvValue(localEnv, "MOCK_POLICY_LAB_RPC_URL", DEFAULT_RPC_URL);
  const threshold = Number(getEnvValue(localEnv, "MOCK_POLICY_LAB_THRESHOLD", String(DEFAULT_THRESHOLD)));
  const signerCount = Number(getEnvValue(localEnv, "MOCK_POLICY_LAB_SIGNER_COUNT", String(DEFAULT_SIGNER_COUNT)));
  const fundAmountRaw = BigInt(getEnvValue(localEnv, "MOCK_POLICY_LAB_FUND_AMOUNT_RAW", DEFAULT_FUND_AMOUNT_RAW.toString()));

  compileMockPolicyContract();

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const rpcClient = new neon.rpc.RPCClient(rpcUrl);
  const council = new neon.wallet.Account(councilWif);
  const version = await rpcClient.execute(new neon.rpc.Query({ method: "getversion" }));
  const magic = Number(version?.protocol?.network);
  if (!Number.isFinite(magic)) throw new Error("Failed to resolve testnet network magic.");

  const extraSigners = Array.from({ length: signerCount - 1 }, () => new neon.wallet.Account());
  const pubkeys = [council.publicKey, ...extraSigners.map((account) => account.publicKey)].sort((a, b) => a.localeCompare(b));
  const multisig = neon.wallet.Account.createMultiSig(threshold, pubkeys);

  const deployment = await deployMockPolicyContract({
    rpcClient,
    deployerAccount: council,
    ownerScriptHash: multisig.scriptHash,
    magic,
  });

  const ownerValue = await poll(
    () => invokeGetter(rpcClient, deployment.contractHash, "getOwner"),
    (value) => !!value
  );

  const beforeCouncilBalances = await rpcClient.execute(
    new neon.rpc.Query({ method: "getnep17balances", params: [council.address] })
  );
  const beforeMultisigBalances = await rpcClient.execute(
    new neon.rpc.Query({ method: "getnep17balances", params: [multisig.address] })
  );

  const fundingTxid = await buildAndSendDirectTransfer({
    rpcClient,
    signerAccount: council,
    toScriptHash: multisig.scriptHash,
    amountRaw: fundAmountRaw,
    magic,
  });

  const fundedMultisigBalances = await poll(
    () => rpcClient.execute(new neon.rpc.Query({ method: "getnep17balances", params: [multisig.address] })),
    (res) => gasBalanceOf(res) >= gasBalanceOf(beforeMultisigBalances) + fundAmountRaw
  );

  const intents = [
    {
      selectedContract: "MockPolicyLab",
      selectedMethod: "setFeePerByte",
      params: { value: "1000" },
      scriptHash: deployment.contractHash,
      operation: "setFeePerByte",
      args: [neon.sc.ContractParam.integer(1000)],
    },
    {
      selectedContract: "MockPolicyLab",
      selectedMethod: "setExecFeeFactor",
      params: { value: "30" },
      scriptHash: deployment.contractHash,
      operation: "setExecFeeFactor",
      args: [neon.sc.ContractParam.integer(30)],
    },
    {
      selectedContract: "MockPolicyLab",
      selectedMethod: "setStoragePrice",
      params: { value: "100000" },
      scriptHash: deployment.contractHash,
      operation: "setStoragePrice",
      args: [neon.sc.ContractParam.integer(100000)],
    },
  ];

  const invokeScript = neon.sc.createScript(
    ...intents.map((intent) => ({
      scriptHash: intent.scriptHash,
      operation: intent.operation,
      args: intent.args,
    }))
  );

  const estimated = await estimateMultisigInvokeFees({
    rpcClient,
    multisigAccount: multisig,
    threshold,
    script: invokeScript,
  });

  const finalTx = new neon.tx.Transaction({
    signers: estimated.signers,
    validUntilBlock: estimated.currentHeight + 1000,
    script: invokeScript,
    systemFee: estimated.systemFeeRaw.toString(),
    networkFee: estimated.networkFeeRaw.toString(),
  });
  const unsignedTxHex = finalTx.serialize(false);
  const signPayload = neon.u.num2hexstring(magic, 4, true) + neon.u.reverseHex(finalTx.hash());
  const signingAccounts = [council, ...extraSigners.slice(0, threshold - 1)];
  const signatures = signingAccounts.map((account) => neon.wallet.sign(signPayload, account.WIF));

  const request = await createRequestCompat(supabase, {
    type: "governance",
    creator_address: council.address,
    target_contract: deployment.contractHash,
    method: intents.map((intent) => intent.selectedMethod).join(","),
    description: `Codex mock policy governance validation ${new Date().toISOString()}`,
    signers_required: threshold,
    eligible_signers: pubkeys.map((pubkey) => new neon.wallet.Account(pubkey).address),
    status: "PENDING",
    network: "testnet",
    params: {
      unsigned_tx: unsignedTxHex,
      hash: finalTx.hash(),
      scriptHash: multisig.scriptHash,
      committee_pubkeys: pubkeys,
      governance_mode: "lab",
      lab_mode: true,
      invocations: intents.map(({ selectedContract, selectedMethod, params }) => ({
        selectedContract,
        selectedMethod,
        params,
      })),
      mock_policy_contract: deployment.contractHash,
    },
  });

  for (let i = 0; i < signatures.length; i += 1) {
    await addSignatureCompat(supabase, {
      request_id: request.id,
      signer_address: signingAccounts[i].address,
      signature: signatures[i],
      witness: {
        signer_address: signingAccounts[i].address,
        signature: signatures[i],
      },
    });
  }

  finalTx.addWitness(neon.tx.Witness.buildMultiSig(signPayload, signatures, multisig));
  const broadcastTxid = await rpcClient.sendRawTransaction(finalTx);
  const appLog = await poll(
    async () => {
      try {
        return await rpcClient.getApplicationLog(broadcastTxid);
      } catch (_error) {
        return null;
      }
    },
    (res) => !!res && Array.isArray(res.executions) && res.executions.length > 0
  );

  const feePerByte = await poll(
    () => invokeGetter(rpcClient, deployment.contractHash, "getFeePerByte"),
    (value) => String(value || "") === "1000"
  );
  const execFeeFactor = await poll(
    () => invokeGetter(rpcClient, deployment.contractHash, "getExecFeeFactor"),
    (value) => String(value || "") === "30"
  );
  const storagePrice = await poll(
    () => invokeGetter(rpcClient, deployment.contractHash, "getStoragePrice"),
    (value) => String(value || "") === "100000"
  );

  const cleanupSignatures = await supabase.from("multisig_signatures").delete().eq("request_id", request.id);
  const cleanupRequest = await supabase.from("multisig_requests").delete().eq("id", request.id);

  console.log(JSON.stringify({
    committeeMemberAddress: council.address,
    committeeMemberPubKey: council.publicKey,
    signerCount,
    threshold,
    generatedSignerAddresses: extraSigners.map((account) => account.address),
    multisigAddress: multisig.address,
    deployedMockPolicyContract: deployment.contractHash,
    deployedMockPolicyName: deployment.contractName,
    computedMockPolicyContract: deployment.computedContractHash,
    chainReportedMockPolicyContract: deployment.chainReportedHash,
    deploymentTxid: deployment.deploymentTxid,
    ownerValue,
    fundingTxid,
    fundedMultisigGasRaw: gasBalanceOf(fundedMultisigBalances).toString(),
    requestId: request.id,
    storedSignatureCount: signatures.length,
    broadcastTxid,
    broadcastVmState: appLog?.executions?.[0]?.vmstate || null,
    broadcastException: appLog?.executions?.[0]?.exception || null,
    feePerByte,
    execFeeFactor,
    storagePrice,
    councilGasBeforeRaw: gasBalanceOf(beforeCouncilBalances).toString(),
    cleanup: {
      signaturesDeleted: !cleanupSignatures.error,
      requestDeleted: !cleanupRequest.error,
      signatureDeleteError: cleanupSignatures.error?.message || null,
      requestDeleteError: cleanupRequest.error?.message || null,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error("MOCK_POLICY_GOVERNANCE_VALIDATION_ERROR");
  console.error(error);
  process.exit(1);
});
