const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const neon = require("@cityofzion/neon-js");

const GAS_TOKEN = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const DEFAULT_RPC_URL = "http://95.216.148.60.sslip.io/testnet";
const SIGNER_COUNT = 21;
const THRESHOLD = 11;
const DEFAULT_MULTISIG_FUND_AMOUNT_RAW = 30000000n; // 0.3 GAS
const DEFAULT_TRANSFER_AMOUNT_RAW = 10000000n; // 0.1 GAS
const DEFAULT_SIGNER_FUND_AMOUNT_RAW = 1000000n; // 0.01 GAS
const FIXED_NETWORK_FEE_RAW = 5000000; // 0.05 GAS

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

async function poll(fn, predicate, attempts = 40, intervalMs = 3000) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return last;
}

function gasBalanceOf(balanceResult) {
  const item = (balanceResult?.balance || []).find(
    (entry) => String(entry.assethash || "").toLowerCase() === GAS_TOKEN.toLowerCase(),
  );
  return item ? BigInt(item.amount) : 0n;
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
      if (Array.isArray(rows) && rows.length > 0) return rows[0];

      throw new Error("Multisig request insert succeeded but no request row could be recovered.");
    }
    let removed = false;
    for (const column of ["type", "unsigned_tx", "metadata"]) {
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

async function addSignatureCompat(supabase, payload) {
  let currentPayload = { ...payload };
  for (;;) {
    const { error } = await supabase.from("multisig_signatures").insert([currentPayload]).select();
    if (!error) return;

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

  const tx = new neon.tx.Transaction({
    signers,
    validUntilBlock: currentHeight + 1000,
    script,
    systemFee: invokeRes.gasconsumed || 0,
    networkFee: FIXED_NETWORK_FEE_RAW,
  });
  tx.sign(signerAccount, magic);
  const txid = await rpcClient.sendRawTransaction(tx);
  return {
    txid,
    systemFeeRaw: BigInt(tx.systemFee),
    networkFeeRaw: BigInt(tx.networkFee),
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
    throw new Error(`Multisig simulation fault: ${invokeRes.exception}`);
  }

  let networkFeeRaw = BigInt(FIXED_NETWORK_FEE_RAW);
  try {
    const probeTx = new neon.tx.Transaction({
      signers,
      validUntilBlock: currentHeight + 1000,
      script,
      systemFee: invokeRes.gasconsumed || 0,
      networkFee: 0,
    });
    probeTx.addWitness(buildDummyMultisigWitness(multisigAccount, threshold));
    networkFeeRaw = BigInt(await rpcClient.calculateNetworkFee(probeTx));
  } catch {
    // Fixed fallback is sufficient for the live validation run.
  }

  return {
    currentHeight,
    script,
    signers,
    systemFeeRaw: BigInt(invokeRes.gasconsumed || 0),
    networkFeeRaw,
  };
}

async function buildAndBroadcastMultisigTransfer({
  rpcClient,
  multisigAccount,
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

  const tx = new neon.tx.Transaction({
    signers: estimated.signers,
    validUntilBlock: estimated.currentHeight + 1000,
    script: estimated.script,
    systemFee: estimated.systemFeeRaw.toString(),
    networkFee: estimated.networkFeeRaw.toString(),
  });
  const unsignedTxHex = tx.serialize(false);
  const signPayload = neon.u.num2hexstring(magic, 4, true) + neon.u.reverseHex(tx.hash());
  const signatures = signingAccounts.map((account) => neon.wallet.sign(signPayload, account.WIF));
  tx.addWitness(neon.tx.Witness.buildMultiSig(signPayload, signatures, multisigAccount));
  const txid = await rpcClient.sendRawTransaction(tx);

  return {
    txid,
    hash: tx.hash(),
    unsignedTxHex,
    signatures,
    systemFeeRaw: estimated.systemFeeRaw,
    networkFeeRaw: estimated.networkFeeRaw,
  };
}

async function maybeFundGeneratedSigners({
  rpcClient,
  council,
  extraSigners,
  fundEachSigner,
  signerFundAmountRaw,
  magic,
}) {
  if (!fundEachSigner) {
    return {
      fundedSignerAddresses: [],
      fundingTxidsBySigner: [],
    };
  }

  const fundedSignerAddresses = [];
  const fundingTxidsBySigner = [];

  for (const signer of extraSigners) {
    const tx = await buildAndSendDirectTransfer({
      rpcClient,
      signerAccount: council,
      toScriptHash: signer.scriptHash,
      amountRaw: signerFundAmountRaw,
      magic,
    });
    await poll(
      () => rpcClient.execute(new neon.rpc.Query({ method: "getnep17balances", params: [signer.address] })),
      (res) => gasBalanceOf(res) >= signerFundAmountRaw,
    );
    fundedSignerAddresses.push(signer.address);
    fundingTxidsBySigner.push({ address: signer.address, txid: tx.txid });
  }

  return {
    fundedSignerAddresses,
    fundingTxidsBySigner,
  };
}

async function main() {
  const localEnv = readEnvFile(path.join(process.cwd(), ".env"));
  const councilWif = getEnvValue(localEnv, "TESTNET_COUNCIL_WIF");
  if (!councilWif) {
    throw new Error("Missing TESTNET_COUNCIL_WIF.");
  }

  const supabaseUrl = getEnvValue(
    localEnv,
    "MULTISIG_11OF21_SUPABASE_URL",
    getEnvValue(localEnv, "VITE_SUPABASE_URL", getEnvValue(localEnv, "SUPABASE_URL")),
  );
  const supabaseAnonKey = getEnvValue(
    localEnv,
    "MULTISIG_11OF21_SUPABASE_ANON_KEY",
    getEnvValue(localEnv, "VITE_SUPABASE_ANON_KEY", getEnvValue(localEnv, "SUPABASE_ANON_KEY")),
  );
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase URL or anon key.");
  }

  const rpcUrl = getEnvValue(localEnv, "MULTISIG_11OF21_RPC_URL", DEFAULT_RPC_URL);
  const multisigFundAmountRaw = BigInt(
    getEnvValue(localEnv, "MULTISIG_11OF21_MULTISIG_FUND_AMOUNT_RAW", DEFAULT_MULTISIG_FUND_AMOUNT_RAW.toString()),
  );
  const transferAmountRaw = BigInt(
    getEnvValue(localEnv, "MULTISIG_11OF21_TRANSFER_AMOUNT_RAW", DEFAULT_TRANSFER_AMOUNT_RAW.toString()),
  );
  const signerFundAmountRaw = BigInt(
    getEnvValue(localEnv, "MULTISIG_11OF21_SIGNER_FUND_AMOUNT_RAW", DEFAULT_SIGNER_FUND_AMOUNT_RAW.toString()),
  );
  const keepData = getBooleanEnvValue(localEnv, "MULTISIG_11OF21_KEEP_DATA", false);
  const fundEachSigner = getBooleanEnvValue(localEnv, "MULTISIG_11OF21_FUND_EACH_SIGNER", false);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const rpcClient = new neon.rpc.RPCClient(rpcUrl);
  const council = new neon.wallet.Account(councilWif);
  const version = await rpcClient.execute(new neon.rpc.Query({ method: "getversion" }));
  const magic = Number(version?.protocol?.network);
  if (!Number.isFinite(magic)) {
    throw new Error("Failed to resolve testnet network magic.");
  }

  const extraSigners = Array.from({ length: SIGNER_COUNT - 1 }, () => new neon.wallet.Account());
  const signerAccounts = [council, ...extraSigners];
  const pubkeys = signerAccounts.map((account) => account.publicKey).sort((a, b) => a.localeCompare(b));
  const multisig = neon.wallet.Account.createMultiSig(THRESHOLD, pubkeys);

  const beforeCouncilBalances = await rpcClient.execute(
    new neon.rpc.Query({ method: "getnep17balances", params: [council.address] }),
  );
  const beforeMultisigBalances = await rpcClient.execute(
    new neon.rpc.Query({ method: "getnep17balances", params: [multisig.address] }),
  );

  const signerFunding = await maybeFundGeneratedSigners({
    rpcClient,
    council,
    extraSigners,
    fundEachSigner,
    signerFundAmountRaw,
    magic,
  });

  const fundingResult = await buildAndSendDirectTransfer({
    rpcClient,
    signerAccount: council,
    toScriptHash: multisig.scriptHash,
    amountRaw: multisigFundAmountRaw,
    magic,
  });

  const fundedMultisigBalances = await poll(
    () => rpcClient.execute(new neon.rpc.Query({ method: "getnep17balances", params: [multisig.address] })),
    (res) => gasBalanceOf(res) >= gasBalanceOf(beforeMultisigBalances) + multisigFundAmountRaw,
  );

  const eligibleSigners = pubkeys.map((pubkey) => new neon.wallet.Account(pubkey).address);
  const signingAccounts = [council, ...extraSigners.slice(0, THRESHOLD - 1)];

  const transferResult = await buildAndBroadcastMultisigTransfer({
    rpcClient,
    multisigAccount: multisig,
    signingAccounts,
    threshold: THRESHOLD,
    toScriptHash: council.scriptHash,
    amountRaw: transferAmountRaw,
    magic,
  });

  const request = await createRequestCompat(supabase, {
    type: "multisig",
    creator_address: council.address,
    title: `11-of-21 multisig transfer validation ${new Date().toISOString()}`,
    contract_hash: GAS_TOKEN,
    method: "transfer",
    description: `Codex 11-of-21 multisig validation ${new Date().toISOString()}`,
    signers_required: THRESHOLD,
    status: "PENDING",
    network: "testnet",
    unsigned_tx: transferResult.unsignedTxHex,
    params: {
      unsigned_tx: transferResult.unsignedTxHex,
      hash: transferResult.hash,
      scriptHash: multisig.scriptHash,
      pubkeys,
      eligible_signers: eligibleSigners,
      validation_lab: true,
      signer_count: SIGNER_COUNT,
      funded_by: council.address,
    },
    metadata: {
      signer_count: SIGNER_COUNT,
      funded_signers: signerFunding.fundedSignerAddresses,
      transfer_amount_raw: transferAmountRaw.toString(),
      multisig_fund_amount_raw: multisigFundAmountRaw.toString(),
    },
  });

  for (let i = 0; i < transferResult.signatures.length; i += 1) {
    await addSignatureCompat(supabase, {
      request_id: request.id,
      signer_address: signingAccounts[i].address,
      signature: transferResult.signatures[i],
      public_key: signingAccounts[i].publicKey,
      witness: {
        signer_address: signingAccounts[i].address,
        signature: transferResult.signatures[i],
        public_key: signingAccounts[i].publicKey,
      },
    });
  }

  const reloadedRequest = await supabase
    .from("multisig_requests")
    .select("*, signatures:multisig_signatures(*)")
    .eq("id", request.id)
    .single();
  if (reloadedRequest.error) throw reloadedRequest.error;

  const appLog = await poll(
    async () => {
      try {
        return await rpcClient.getApplicationLog(transferResult.txid);
      } catch {
        return null;
      }
    },
    (res) => !!res && Array.isArray(res.executions) && res.executions.length > 0,
  );

  const afterCouncilBalances = await poll(
    () => rpcClient.execute(new neon.rpc.Query({ method: "getnep17balances", params: [council.address] })),
    (res) => gasBalanceOf(res) > gasBalanceOf(beforeCouncilBalances) - multisigFundAmountRaw,
  );
  const afterMultisigBalances = await rpcClient.execute(
    new neon.rpc.Query({ method: "getnep17balances", params: [multisig.address] }),
  );

  let cleanupSignatures = { error: null };
  let cleanupRequest = { error: null };
  if (!keepData) {
    cleanupSignatures = await supabase.from("multisig_signatures").delete().eq("request_id", request.id);
    cleanupRequest = await supabase.from("multisig_requests").delete().eq("id", request.id);
  }

  console.log(JSON.stringify({
    committeeMemberAddress: council.address,
    committeeMemberPubKey: council.publicKey,
    signerCount: SIGNER_COUNT,
    threshold: THRESHOLD,
    keepData,
    fundEachSigner,
    governanceSignerAddresses: signerAccounts.map((account) => account.address),
    generatedSignerAddresses: extraSigners.map((account) => account.address),
    fundedSignerAddresses: signerFunding.fundedSignerAddresses,
    fundingTxidsBySigner: signerFunding.fundingTxidsBySigner,
    multisigAddress: multisig.address,
    multisigScriptHash: multisig.scriptHash,
    fundingTxid: fundingResult.txid,
    fundedMultisigGasRaw: gasBalanceOf(fundedMultisigBalances).toString(),
    requestId: request.id,
    storedSignatureCount: reloadedRequest.data.signatures.length,
    storedSignatureAddresses: reloadedRequest.data.signatures.map((row) => row.signer_address),
    broadcastTxid: transferResult.txid,
    broadcastVmState: appLog?.executions?.[0]?.vmstate || null,
    broadcastException: appLog?.executions?.[0]?.exception || null,
    councilGasBeforeRaw: gasBalanceOf(beforeCouncilBalances).toString(),
    councilGasAfterRaw: gasBalanceOf(afterCouncilBalances).toString(),
    multisigGasAfterBroadcastRaw: gasBalanceOf(afterMultisigBalances).toString(),
    cleanup: {
      signaturesDeleted: keepData ? false : !cleanupSignatures.error,
      requestDeleted: keepData ? false : !cleanupRequest.error,
      signatureDeleteError: cleanupSignatures.error?.message || null,
      requestDeleteError: cleanupRequest.error?.message || null,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error("TESTNET_11_OF_21_MULTISIG_VALIDATION_ERROR");
  console.error(error);
  process.exit(1);
});
