const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const neon = require("@cityofzion/neon-js");
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_RPC_URL = "https://api.n3index.dev/testnet";
const DEFAULT_THRESHOLD = 2;
const DEFAULT_SIGNER_COUNT = 3;
const DEFAULT_FUND_AMOUNT_RAW = 3000000n; // 0.03 GAS
const DEFAULT_MILLISECONDS_PER_BLOCK = 3000;
const DEFAULT_GAS_PER_BLOCK = 100000000;
const DEFAULT_DEPLOY_NETWORK_FEE_RAW = 100000000n; // 1 GAS fallback when RPC fee probes reject deploy txs
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

function getBooleanEnvValue(localEnv, key, fallback = false) {
  const value = getEnvValue(localEnv, key, fallback ? "true" : "false");
  return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

function isMissingColumnError(error, column) {
  const message = String(error?.message || "");
  return message.includes(`'${column}'`) && /schema cache|column/i.test(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function buildSignatureMetadata(payload = {}) {
  const metadata = {};
  if (typeof payload.public_key === "string" && payload.public_key.trim()) {
    metadata.public_key = payload.public_key.trim();
  }
  if (typeof payload.invocation_script === "string" && payload.invocation_script.trim()) {
    metadata.invocation_script = payload.invocation_script.trim();
  }
  if (typeof payload.verification_script === "string" && payload.verification_script.trim()) {
    metadata.verification_script = payload.verification_script.trim();
  }
  if (isPlainObject(payload.witness)) {
    metadata.witness = payload.witness;
  }
  return Object.keys(metadata).length > 0 ? metadata : null;
}

function mergeRequestSignatureMetadata(request, signerAddress, metadata) {
  const currentParams = isPlainObject(request?.params) ? request.params : {};
  const signatureMetadata = isPlainObject(currentParams.signature_metadata)
    ? currentParams.signature_metadata
    : {};
  const existingEntry = isPlainObject(signatureMetadata[signerAddress])
    ? signatureMetadata[signerAddress]
    : {};

  return {
    ...currentParams,
    signature_metadata: {
      ...signatureMetadata,
      [signerAddress]: {
        ...existingEntry,
        ...metadata,
      },
    },
  };
}

async function createRequestCompat(supabase, payload) {
  let currentPayload = { ...payload };
  for (;;) {
    const { data, error } = await supabase.from("multisig_requests").insert([currentPayload]).select().single();
    if (!error) {
      if (data && data.id) return data;

      const fallbackQuery = supabase
        .from("multisig_requests")
        .select("id, params, description, method, creator_address, network")
        .eq("creator_address", currentPayload.creator_address)
        .eq("method", currentPayload.method)
        .eq("description", currentPayload.description)
        .eq("network", currentPayload.network)
        .order("id", { ascending: false })
        .limit(1);

      const { data: rows, error: fetchError } = await fallbackQuery;
      if (fetchError) throw fetchError;
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0];
      }

      throw new Error("Governance request insert succeeded but no request row could be recovered.");
    }
    if (isMissingColumnError(error, "type") && "type" in currentPayload) {
      delete currentPayload.type;
      continue;
    }
    throw error;
  }
}

async function addSignatureCompat(supabase, payload) {
  let currentPayload = { ...payload };
  const signatureMetadata = buildSignatureMetadata(payload);
  for (;;) {
    const { data, error } = await supabase.from("multisig_signatures").insert([currentPayload]).select();
    if (!error) {
      if (signatureMetadata) {
        const { data: requestData, error: requestError } = await supabase
          .from("multisig_requests")
          .select("id, params")
          .eq("id", payload.request_id)
          .single();
        if (requestError) throw requestError;

        const mergedParams = mergeRequestSignatureMetadata(
          requestData,
          payload.signer_address,
          signatureMetadata
        );
        const { error: updateError } = await supabase
          .from("multisig_requests")
          .update({ params: mergedParams })
          .eq("id", payload.request_id)
          .select();
        if (updateError) throw updateError;
      }
      return data;
    }
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

function compileContract(projectFile, outputDir, baseName) {
  execFileSync(path.join(process.env.HOME || "", ".dotnet", "tools", "nccs"), [
    projectFile,
    "-o",
    outputDir,
    "--base-name",
    baseName,
    "--assembly",
    "--generate-artifacts=All",
    "--optimize=All",
  ], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function compileMockPolicyContract() {
  compileContract(
    "contracts/MockPolicyLab/MockPolicyLab.csproj",
    "contracts/MockPolicyLab/bin/sc",
    "MockPolicyLab"
  );
}

function compileMockNeoTokenContract() {
  compileContract(
    "contracts/MockNeoTokenLab/MockNeoTokenLab.csproj",
    "contracts/MockNeoTokenLab/bin/sc",
    "MockNeoTokenLab"
  );
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

async function deployCompiledContract({
  rpcClient,
  deployerAccount,
  ownerScriptHash,
  magic,
  artifactsDir,
  baseName,
}) {
  const nefPath = path.resolve(process.cwd(), artifactsDir, `${baseName}.nef`);
  const manifestPath = path.resolve(process.cwd(), artifactsDir, `${baseName}.manifest.json`);
  const nefBuffer = fs.readFileSync(nefPath);
  const nefObject = neon.sc.NEF.fromBuffer(nefBuffer);
  const manifestObject = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifestObject.name = `${baseName}_${Date.now()}`;
  const manifestString = JSON.stringify(manifestObject);

  const script = neon.sc.createScript({
    scriptHash: CONTRACT_MANAGEMENT_HASH,
    operation: "deploy",
    args: [
      neon.sc.ContractParam.byteArray(neon.u.HexString.fromHex(nefBuffer.toString("hex"), true)),
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
  let networkFee;
  try {
    networkFee = await rpcClient.calculateNetworkFee(transaction);
  } catch (error) {
    networkFee = DEFAULT_DEPLOY_NETWORK_FEE_RAW.toString();
  }
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

async function deployMockPolicyContract({ rpcClient, deployerAccount, ownerScriptHash, magic }) {
  return deployCompiledContract({
    rpcClient,
    deployerAccount,
    ownerScriptHash,
    magic,
    artifactsDir: "contracts/MockPolicyLab/bin/sc",
    baseName: "MockPolicyLab",
  });
}

async function deployMockNeoTokenContract({ rpcClient, deployerAccount, ownerScriptHash, magic }) {
  return deployCompiledContract({
    rpcClient,
    deployerAccount,
    ownerScriptHash,
    magic,
    artifactsDir: "contracts/MockNeoTokenLab/bin/sc",
    baseName: "MockNeoTokenLab",
  });
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
  const useGeneratedSignersOnly = getBooleanEnvValue(localEnv, "MOCK_POLICY_LAB_USE_GENERATED_SIGNERS_ONLY", false);
  const emitSignerWifs = getBooleanEnvValue(localEnv, "MOCK_POLICY_LAB_EMIT_SIGNER_WIFS", false);
  const millisecondsPerBlock = Number(
    getEnvValue(localEnv, "MOCK_POLICY_LAB_MILLISECONDS_PER_BLOCK", String(DEFAULT_MILLISECONDS_PER_BLOCK))
  );
  const gasPerBlock = Number(
    getEnvValue(localEnv, "MOCK_NEO_TOKEN_LAB_GAS_PER_BLOCK", String(DEFAULT_GAS_PER_BLOCK))
  );

  compileMockPolicyContract();
  compileMockNeoTokenContract();

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const rpcClient = new neon.rpc.RPCClient(rpcUrl);
  const council = new neon.wallet.Account(councilWif);
  const version = await rpcClient.execute(new neon.rpc.Query({ method: "getversion" }));
  const magic = Number(version?.protocol?.network);
  if (!Number.isFinite(magic)) throw new Error("Failed to resolve testnet network magic.");

  const generatedSigners = Array.from({ length: signerCount }, () => new neon.wallet.Account());
  const governanceSignerAccounts = useGeneratedSignersOnly
    ? generatedSigners
    : [council, ...generatedSigners.slice(0, Math.max(0, signerCount - 1))];
  const pubkeys = governanceSignerAccounts.map((account) => account.publicKey).sort((a, b) => a.localeCompare(b));
  const multisig = neon.wallet.Account.createMultiSig(threshold, pubkeys);
  const requestCreator = governanceSignerAccounts[0];

  const deployment = await deployMockPolicyContract({
    rpcClient,
    deployerAccount: council,
    ownerScriptHash: multisig.scriptHash,
    magic,
  });
  const neoTokenDeployment = await deployMockNeoTokenContract({
    rpcClient,
    deployerAccount: council,
    ownerScriptHash: multisig.scriptHash,
    magic,
  });

  const policyOwnerValue = await poll(
    () => invokeGetter(rpcClient, deployment.contractHash, "getOwner"),
    (value) => !!value
  );
  const neoTokenOwnerValue = await poll(
    () => invokeGetter(rpcClient, neoTokenDeployment.contractHash, "getOwner"),
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
      selectedMethod: "setMillisecondsPerBlock",
      params: { value: String(millisecondsPerBlock) },
      targetHash: deployment.contractHash,
      scriptHash: deployment.contractHash,
      operation: "setMillisecondsPerBlock",
      args: [neon.sc.ContractParam.integer(millisecondsPerBlock)],
      callFlags: neon.sc.CallFlags.States | neon.sc.CallFlags.AllowNotify,
    },
    {
      selectedContract: "MockNeoTokenLab",
      selectedMethod: "setGasPerBlock",
      params: { gasPerBlock: String(gasPerBlock) },
      targetHash: neoTokenDeployment.contractHash,
      scriptHash: neoTokenDeployment.contractHash,
      operation: "setGasPerBlock",
      args: [neon.sc.ContractParam.integer(gasPerBlock)],
      callFlags: neon.sc.CallFlags.States,
    },
  ];

  const invokeScript = neon.sc.createScript(
    ...intents.map((intent) => ({
      scriptHash: intent.scriptHash,
      operation: intent.operation,
      args: intent.args,
      callFlags: intent.callFlags,
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
  const signingAccounts = governanceSignerAccounts.slice(0, threshold);
  const signatures = signingAccounts.map((account) => neon.wallet.sign(signPayload, account.WIF));

  const request = await createRequestCompat(supabase, {
    type: "governance",
    creator_address: requestCreator.address,
    title: `Mock policy governance validation ${new Date().toISOString()}`,
    contract_hash: deployment.contractHash,
    method: intents.map((intent) => intent.selectedMethod).join(","),
    description: `Codex dual-contract governance validation ${new Date().toISOString()}`,
    signers_required: threshold,
    status: "PENDING",
    network: "testnet",
    params: {
      unsigned_tx: unsignedTxHex,
      hash: finalTx.hash(),
      scriptHash: multisig.scriptHash,
      committee_pubkeys: pubkeys,
      eligible_signers: pubkeys.map((pubkey) => new neon.wallet.Account(pubkey).address),
      governance_mode: "lab",
      lab_mode: true,
      target_contracts: [deployment.contractHash, neoTokenDeployment.contractHash],
      invocations: intents.map(({ selectedContract, selectedMethod, params, targetHash }) => ({
        selectedContract,
        selectedMethod,
        params,
        targetHash,
      })),
      mock_policy_contract: deployment.contractHash,
      mock_neo_token_contract: neoTokenDeployment.contractHash,
    },
  });

  for (let i = 0; i < signatures.length; i += 1) {
    await addSignatureCompat(supabase, {
      request_id: request.id,
      signer_address: signingAccounts[i].address,
      signature: signatures[i],
      public_key: signingAccounts[i].publicKey,
      invocation_script: `0c40${signatures[i]}`,
      witness: {
        signer_address: signingAccounts[i].address,
        signature: signatures[i],
        public_key: signingAccounts[i].publicKey,
        invocation_script: `0c40${signatures[i]}`,
      },
    });
  }

  const storedRequestSnapshot = await supabase
    .from("multisig_requests")
    .select("id, params")
    .eq("id", request.id)
    .single();
  const storedSignatureRowsSnapshot = await supabase
    .from("multisig_signatures")
    .select("*")
    .eq("request_id", request.id);

  const signatureMetadata = storedRequestSnapshot.data?.params?.signature_metadata || {};
  const storedSignatureRows = Array.isArray(storedSignatureRowsSnapshot.data)
    ? storedSignatureRowsSnapshot.data
    : [];

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

  const storedMillisecondsPerBlock = await poll(
    () => invokeGetter(rpcClient, deployment.contractHash, "getMillisecondsPerBlock"),
    (value) => String(value || "") === String(millisecondsPerBlock)
  );
  const storedGasPerBlock = await poll(
    () => invokeGetter(rpcClient, neoTokenDeployment.contractHash, "getGasPerBlock"),
    (value) => String(value || "") === String(gasPerBlock)
  );

  const cleanupSignatures = await supabase.from("multisig_signatures").delete().eq("request_id", request.id);
  const cleanupRequest = await supabase.from("multisig_requests").delete().eq("id", request.id);

  console.log(JSON.stringify({
    committeeMemberAddress: council.address,
    committeeMemberPubKey: council.publicKey,
    signerCount,
    threshold,
    useGeneratedSignersOnly,
    governanceSignerAddresses: governanceSignerAccounts.map((account) => account.address),
    governanceSignerAccounts: governanceSignerAccounts.map((account) => ({
      address: account.address,
      publicKey: account.publicKey,
    })),
    generatedSignerAddresses: generatedSigners.map((account) => account.address),
    generatedSignerWifs: emitSignerWifs ? generatedSigners.map((account) => account.WIF) : undefined,
    multisigAddress: multisig.address,
    deployedMockPolicyContract: deployment.contractHash,
    deployedMockPolicyName: deployment.contractName,
    computedMockPolicyContract: deployment.computedContractHash,
    chainReportedMockPolicyContract: deployment.chainReportedHash,
    deployedMockNeoTokenContract: neoTokenDeployment.contractHash,
    deployedMockNeoTokenName: neoTokenDeployment.contractName,
    computedMockNeoTokenContract: neoTokenDeployment.computedContractHash,
    chainReportedMockNeoTokenContract: neoTokenDeployment.chainReportedHash,
    deploymentTxid: deployment.deploymentTxid,
    neoTokenDeploymentTxid: neoTokenDeployment.deploymentTxid,
    policyOwnerValue,
    neoTokenOwnerValue,
    fundingTxid,
    fundedMultisigGasRaw: gasBalanceOf(fundedMultisigBalances).toString(),
    requestId: request.id,
    storedSignatureCount: signatures.length,
    storedSignatureMetadataCount: Object.keys(signatureMetadata).length,
    storedSignatureMetadataSigners: Object.keys(signatureMetadata),
    storedSignatureRowCount: storedSignatureRows.length,
    storedSignatureRowPublicKeyCount: storedSignatureRows.filter((row) => row?.public_key).length,
    storedSignatureRowWitnessCount: storedSignatureRows.filter((row) => row?.witness).length,
    storedSignatureRowInvocationCount: storedSignatureRows.filter((row) => row?.invocation_script).length,
    broadcastTxid,
    broadcastVmState: appLog?.executions?.[0]?.vmstate || null,
    broadcastException: appLog?.executions?.[0]?.exception || null,
    millisecondsPerBlock: storedMillisecondsPerBlock,
    gasPerBlock: storedGasPerBlock,
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
