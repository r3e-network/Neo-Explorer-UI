const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { loadNeoCompat } = require("./lib/loadNeoCompat");

let neon = null;

const GAS_TOKEN = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const DEFAULT_RPC_URL = "https://api.n3index.dev/testnet";
const DEFAULT_THRESHOLD = 2;
const DEFAULT_SIGNER_COUNT = 3;
const DEFAULT_FUND_AMOUNT_RAW = 3000000n; // 0.03 GAS
const DEFAULT_TRANSFER_BACK_RAW = 1500000n; // 0.015 GAS
const DEFAULT_TIMEOUT_ATTEMPTS = 40;
const DEFAULT_TIMEOUT_INTERVAL_MS = 3000;

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

async function poll(fn, predicate, attempts = DEFAULT_TIMEOUT_ATTEMPTS, intervalMs = DEFAULT_TIMEOUT_INTERVAL_MS) {
  let lastResult = null;
  for (let i = 0; i < attempts; i += 1) {
    lastResult = await fn();
    if (predicate(lastResult)) return lastResult;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return lastResult;
}

function gasBalanceOf(balanceResult) {
  const balance = (balanceResult?.balance || []).find(
    (entry) => String(entry.assethash || "").toLowerCase() === GAS_TOKEN.toLowerCase()
  );
  return balance ? BigInt(balance.amount) : 0n;
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
    throw new Error(`Direct transfer simulation fault: ${invokeRes.exception}`);
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
  return {
    txid,
    systemFeeRaw: BigInt(tx.systemFee),
    networkFeeRaw: BigInt(tx.networkFee),
  };
}

async function estimateMultisigTransferFees({ rpcClient, multisigAccount, threshold, toScriptHash, amountRaw }) {
  const builder = new neon.sc.ScriptBuilder();
  builder.emitAppCall(GAS_TOKEN, "transfer", [
    neon.sc.ContractParam.hash160(multisigAccount.scriptHash),
    neon.sc.ContractParam.hash160(toScriptHash),
    neon.sc.ContractParam.integer(Number(amountRaw)),
    neon.sc.ContractParam.any(null),
  ]);

  const script = builder.build();
  const currentHeight = await rpcClient.getBlockCount();
  const signers = [{ account: multisigAccount.scriptHash, scopes: neon.tx.WitnessScope.CalledByEntry }];
  const invokeRes = await rpcClient.invokeScript(neon.u.HexString.fromHex(script), signers);
  if (invokeRes.state === "FAULT") {
    throw new Error(`Lower-threshold multisig simulation fault: ${invokeRes.exception}`);
  }

  const feeProbeTx = new neon.tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: invokeRes.gasconsumed || 0,
    networkFee: 0,
  });
  feeProbeTx.addWitness(buildDummyMultisigWitness(multisigAccount, threshold));
  const networkFeeRaw = BigInt(await rpcClient.calculateNetworkFee(feeProbeTx));

  return {
    script,
    signers,
    validUntilBlock: currentHeight + 1000,
    systemFeeRaw: BigInt(invokeRes.gasconsumed || 0),
    networkFeeRaw,
  };
}

async function buildAndBroadcastMultisigTransfer({
  rpcClient,
  multisigAccount,
  _pubkeys,
  signingAccounts,
  threshold,
  toScriptHash,
  amountRaw,
  magic,
}) {
  const estimated = await estimateMultisigTransferFees({
    rpcClient,
    multisigAccount,
    threshold,
    toScriptHash,
    amountRaw,
  });

  const finalTx = new neon.tx.Transaction({
    signers: estimated.signers,
    validUntilBlock: estimated.validUntilBlock,
    script: estimated.script,
    systemFee: estimated.systemFeeRaw.toString(),
    networkFee: estimated.networkFeeRaw.toString(),
  });

  const unsignedTxHex = finalTx.serialize(false);
  const signPayload = neon.u.num2hexstring(magic, 4, true) + neon.u.reverseHex(finalTx.hash());
  const signatures = signingAccounts.map((account) => neon.wallet.sign(signPayload, account.WIF));
  const witness = neon.tx.Witness.buildMultiSig(signPayload, signatures, multisigAccount);
  finalTx.addWitness(witness);
  const txid = await rpcClient.sendRawTransaction(finalTx);

  return {
    txid,
    unsignedTxHex,
    hash: finalTx.hash(),
    systemFeeRaw: estimated.systemFeeRaw,
    networkFeeRaw: estimated.networkFeeRaw,
    signPayload,
    signatures,
  };
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

async function main() {
  neon = await loadNeoCompat();
  const localEnv = readEnvFile(path.join(process.cwd(), ".env"));

  const councilWif = getEnvValue(localEnv, "TESTNET_COUNCIL_WIF");
  if (!councilWif) {
    throw new Error("Missing TESTNET_COUNCIL_WIF.");
  }

  const supabaseUrl = getEnvValue(localEnv, "VITE_SUPABASE_URL", getEnvValue(localEnv, "SUPABASE_URL"));
  const supabaseAnonKey = getEnvValue(
    localEnv,
    "VITE_SUPABASE_ANON_KEY",
    getEnvValue(localEnv, "SUPABASE_ANON_KEY")
  );
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase URL or anon key.");
  }

  const rpcUrl = getEnvValue(localEnv, "MULTISIG_LAB_RPC_URL", DEFAULT_RPC_URL);
  const threshold = Number(getEnvValue(localEnv, "MULTISIG_LAB_THRESHOLD", String(DEFAULT_THRESHOLD)));
  const signerCount = Number(getEnvValue(localEnv, "MULTISIG_LAB_SIGNER_COUNT", String(DEFAULT_SIGNER_COUNT)));
  const fundAmountRaw = BigInt(getEnvValue(localEnv, "MULTISIG_LAB_FUND_AMOUNT_RAW", DEFAULT_FUND_AMOUNT_RAW.toString()));
  const transferBackRaw = BigInt(
    getEnvValue(localEnv, "MULTISIG_LAB_TRANSFER_BACK_RAW", DEFAULT_TRANSFER_BACK_RAW.toString())
  );

  if (signerCount < threshold) {
    throw new Error(`Signer count ${signerCount} cannot be lower than threshold ${threshold}.`);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const rpcClient = new neon.rpc.RPCClient(rpcUrl);
  const council = new neon.wallet.Account(councilWif);
  const version = await rpcClient.execute(new neon.rpc.Query({ method: "getversion" }));
  const magic = Number(version?.protocol?.network);
  if (!Number.isFinite(magic)) {
    throw new Error("Failed to resolve testnet network magic.");
  }

  const extraSigners = Array.from({ length: signerCount - 1 }, () => new neon.wallet.Account());
  const pubkeys = [council.publicKey, ...extraSigners.map((account) => account.publicKey)].sort((a, b) =>
    a.localeCompare(b)
  );
  const multisig = neon.wallet.Account.createMultiSig(threshold, pubkeys);

  const committee = await rpcClient.getCommittee();
  const beforeCouncilBalances = await rpcClient.execute(
    new neon.rpc.Query({ method: "getnep17balances", params: [council.address] })
  );
  const beforeMultisigBalances = await rpcClient.execute(
    new neon.rpc.Query({ method: "getnep17balances", params: [multisig.address] })
  );

  const fundingResult = await buildAndSendDirectTransfer({
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

  const eligibleSigners = pubkeys.map((pubkey) => new neon.wallet.Account(pubkey).address);
  const signatureMap = new Map();
  const signingAccounts = [council, ...extraSigners.slice(0, threshold - 1)];

  const firstTransfer = await buildAndBroadcastMultisigTransfer({
    rpcClient,
    multisigAccount: multisig,
    pubkeys,
    signingAccounts,
    threshold,
    toScriptHash: council.scriptHash,
    amountRaw: transferBackRaw,
    magic,
  });
  const unsignedTxHex = firstTransfer.unsignedTxHex;
  for (let i = 0; i < signingAccounts.length; i += 1) {
    signatureMap.set(signingAccounts[i].address, firstTransfer.signatures[i]);
  }

  const request = await createRequestCompat(supabase, {
    type: "multisig",
    creator_address: council.address,
    target_contract: GAS_TOKEN.replace(/^0x/, ""),
    method: "transfer",
    description: `Codex lower-threshold multisig validation ${new Date().toISOString()}`,
    signers_required: threshold,
    eligible_signers: eligibleSigners,
    status: "PENDING",
    network: "testnet",
    params: {
      unsigned_tx: unsignedTxHex,
      hash: firstTransfer.hash,
      scriptHash: multisig.scriptHash,
      pubkeys,
      validation_lab: true,
    },
  });

  for (const [signerAddress, signature] of signatureMap.entries()) {
    await addSignatureCompat(supabase, {
      request_id: request.id,
      signer_address: signerAddress,
      signature,
      witness: {
        signer_address: signerAddress,
        signature,
      },
    });
  }

  const reloadedRequest = await supabase
    .from("multisig_requests")
    .select("*, signatures:multisig_signatures(*)")
    .eq("id", request.id)
    .single();
  if (reloadedRequest.error) throw reloadedRequest.error;

  const broadcastTxid = firstTransfer.txid;

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

  const afterCouncilBalances = await poll(
    () => rpcClient.execute(new neon.rpc.Query({ method: "getnep17balances", params: [council.address] })),
    (res) => gasBalanceOf(res) > gasBalanceOf(beforeCouncilBalances) - fundAmountRaw
  );
  const afterFirstMultisigBalances = await rpcClient.execute(
    new neon.rpc.Query({ method: "getnep17balances", params: [multisig.address] })
  );

  let drainTxid = null;
  let drainSystemFeeRaw = 0n;
  let drainNetworkFeeRaw = 0n;
  let drainVmState = null;
  let drainException = null;
  let afterDrainMultisigBalances = afterFirstMultisigBalances;
  const currentMultisigGas = gasBalanceOf(afterFirstMultisigBalances);
  if (currentMultisigGas > 0n) {
    const drainEstimate = await estimateMultisigTransferFees({
      rpcClient,
      multisigAccount: multisig,
      threshold,
      toScriptHash: council.scriptHash,
      amountRaw: 1n,
    });
    const drainableAmount = currentMultisigGas - drainEstimate.systemFeeRaw - drainEstimate.networkFeeRaw - 1n;
    if (drainableAmount > 0n) {
      const drainTransfer = await buildAndBroadcastMultisigTransfer({
        rpcClient,
        multisigAccount: multisig,
        pubkeys,
        signingAccounts,
        threshold,
        toScriptHash: council.scriptHash,
        amountRaw: drainableAmount,
        magic,
      });
      drainTxid = drainTransfer.txid;
      drainSystemFeeRaw = drainTransfer.systemFeeRaw;
      drainNetworkFeeRaw = drainTransfer.networkFeeRaw;
      const expectedResidual = currentMultisigGas - drainableAmount - drainTransfer.systemFeeRaw - drainTransfer.networkFeeRaw;
      const drainLog = await poll(
        async () => {
          try {
            return await rpcClient.getApplicationLog(drainTxid);
          } catch (_error) {
            return null;
          }
        },
        (res) => !!res && Array.isArray(res.executions) && res.executions.length > 0
      );
      drainVmState = drainLog?.executions?.[0]?.vmstate || null;
      drainException = drainLog?.executions?.[0]?.exception || null;
      afterDrainMultisigBalances = await poll(
        () => rpcClient.execute(new neon.rpc.Query({ method: "getnep17balances", params: [multisig.address] })),
        (res) => gasBalanceOf(res) <= expectedResidual + 10n
      );
    }
  }

  const cleanupSignatures = await supabase.from("multisig_signatures").delete().eq("request_id", request.id);
  const cleanupRequest = await supabase.from("multisig_requests").delete().eq("id", request.id);

  const report = {
    committeeMemberAddress: council.address,
    committeeMemberPubKey: council.publicKey,
    councilStillInCommittee: committee.includes(council.publicKey),
    signerCount,
    threshold,
    generatedSignerAddresses: extraSigners.map((account) => account.address),
    multisigAddress: multisig.address,
    fundingTxid: fundingResult.txid,
    fundedMultisigGasRaw: gasBalanceOf(fundedMultisigBalances).toString(),
    transferBackRaw: transferBackRaw.toString(),
    multisigSystemFeeRaw: firstTransfer.systemFeeRaw.toString(),
    multisigNetworkFeeRaw: firstTransfer.networkFeeRaw.toString(),
    requestId: request.id,
    storedSignatureCount: reloadedRequest.data.signatures.length,
    broadcastTxid,
    broadcastVmState: appLog?.executions?.[0]?.vmstate || null,
    broadcastException: appLog?.executions?.[0]?.exception || null,
    councilGasBeforeRaw: gasBalanceOf(beforeCouncilBalances).toString(),
    councilGasAfterRaw: gasBalanceOf(afterCouncilBalances).toString(),
    multisigGasAfterFirstBroadcastRaw: gasBalanceOf(afterFirstMultisigBalances).toString(),
    drainTxid,
    drainSystemFeeRaw: drainSystemFeeRaw.toString(),
    drainNetworkFeeRaw: drainNetworkFeeRaw.toString(),
    drainVmState,
    drainException,
    multisigGasAfterDrainRaw: gasBalanceOf(afterDrainMultisigBalances).toString(),
    cleanup: {
      signaturesDeleted: !cleanupSignatures.error,
      requestDeleted: !cleanupRequest.error,
      signatureDeleteError: cleanupSignatures.error?.message || null,
      requestDeleteError: cleanupRequest.error?.message || null,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("LOWER_THRESHOLD_MULTISIG_VALIDATION_ERROR");
  console.error(error);
  process.exit(1);
});
