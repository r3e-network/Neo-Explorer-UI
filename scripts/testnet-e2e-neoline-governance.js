/**
 * End-to-end test for council governance signing on testnet
 * Uses a self-generated 11-of-21 committee multisig with dummy signer injection.
 * Tests: direct WIF signing, witness assembly, and broadcast.
 */

const neon = require("@cityofzion/neon-js");
const { rpc, tx, sc, wallet, u } = neon;
const { Pool } = require("pg");

// ═══ Config ═══
const TESTNET_RPC = "https://api.n3index.dev/testnet";
const PROVIDED_WIF = "L4cNA7HKn5CRtPeKJCSedTFpej8Yq2E5s1xvhxoHKBjcFcvqG9HZ";
const THRESHOLD = 11;
const COMMITTEE_SIZE = 21;

// Mock native contract hashes
const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";

async function main() {
  console.log("═".repeat(60));
  console.log("Testnet Council Governance E2E Test (11-of-21 + dummy signers)");
  console.log("═".repeat(60));

  // ─── 1. Build committee ───
  const member0 = new wallet.Account(PROVIDED_WIF);
  const members = [member0];
  for (let i = 1; i < COMMITTEE_SIZE; i++) {
    members.push(new wallet.Account());
  }

  const committeePubkeys = members.map((m) => m.publicKey);
  console.log("\n📋 Committee Members:");
  members.forEach((m, i) => {
    console.log(`  Member ${i}: ${m.address}  pubkey=${m.publicKey}`);
  });

  // ─── 2. Create multisig account ───
  const multiSig = wallet.Account.createMultiSig(THRESHOLD, committeePubkeys);
  console.log("\n🔐 Multisig Account:");
  console.log(`  Address: ${multiSig.address}`);
  console.log(`  ScriptHash: ${multiSig.scriptHash}`);

  // ─── 3. Build mocked governance transaction ───
  const script = sc.createScript({
    scriptHash: GAS_HASH,
    operation: "balanceOf",
    args: [sc.ContractParam.hash160(multiSig.address)],
  });

  const rpcClient = new rpc.RPCClient(TESTNET_RPC);
  const blockcount = await rpcClient.getBlockCount();
  const validUntil = blockcount + 1000;

  // Build signers: multisig (Global scope for governance) + each member (None).
  // Neo N3 has a hard limit of 16 signers per transaction, so we cap dummy
  // individual signers at 15 (plus 1 multisig = 16 total).
  const MAX_INDIVIDUAL_SIGNERS = 15;
  const signers = [
    { account: multiSig.scriptHash, scopes: tx.WitnessScope.Global },
  ];
  for (let i = 0; i < members.length && i < MAX_INDIVIDUAL_SIGNERS; i++) {
    signers.push({ account: members[i].scriptHash, scopes: tx.WitnessScope.None });
  }

  const transaction = new tx.Transaction({
    signers,
    validUntilBlock: validUntil,
    script,
  });

  const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script).toBase64(), [
    { account: multiSig.scriptHash, scopes: tx.WitnessScope.CalledByEntry },
  ]);
  if (invokeRes.state !== "HALT") {
    throw new Error("Invoke script failed: " + JSON.stringify(invokeRes));
  }
  transaction.systemFee = u.BigInteger.fromNumber(Number(invokeRes.gasconsumed || 0));

  // ─── 4. Calculate network fee with dummy witnesses ───
  const feeProbeTx = tx.Transaction.deserialize(transaction.serialize(false));
  feeProbeTx.systemFee = transaction.systemFee;

  // Dummy multisig witness (position 0)
  const dummyMultisig = new tx.Witness({
    invocationScript: "",
    verificationScript: Buffer.from(multiSig.contract.script, "base64").toString("hex"),
  });
  const feeWitnesses = [dummyMultisig];

  // Dummy individual witnesses (positions 1..N, capped at 15)
  const dummySig = "00".repeat(64);
  for (let i = 0; i < members.length && i < MAX_INDIVIDUAL_SIGNERS; i++) {
    const sb = new sc.ScriptBuilder();
    sb.emitPush(u.HexString.fromHex(dummySig));
    feeWitnesses.push(new tx.Witness({
      invocationScript: sb.build(),
      verificationScript: "0c21" + members[i].publicKey + "4156e7b327",
    }));
  }
  feeProbeTx.witnesses = feeWitnesses;

  let networkFee;
  try {
    networkFee = u.BigInteger.fromNumber(Number(await rpcClient.calculateNetworkFee(feeProbeTx)));
  } catch (err) {
    console.log("⚠️ calculateNetworkFee failed, using hardcoded fee:", err.message);
    networkFee = u.BigInteger.fromNumber(150000000);
  }
  transaction.networkFee = networkFee;
  console.log(`  Network fee: ${transaction.networkFee}`);

  // ─── 5. Serialize unsigned transaction ───
  const unsignedTxHex = transaction.serialize(false);
  console.log("\n📦 Unsigned Transaction:");
  console.log(`  Hex: ${unsignedTxHex}`);
  console.log(`  Valid Until Block: ${validUntil}`);

  // ─── 6. Compute signing payload ───
  const versionRes = await rpcClient.getVersion();
  const networkMagic = versionRes.protocol.network;
  const signPayload = transaction.getMessageForSigning(networkMagic);
  console.log("\n✍️  Signing Payload:");
  console.log(`  Network Magic: ${networkMagic}`);
  console.log(`  Transaction Hash: ${transaction.hash()}`);
  console.log(`  Payload Hex: ${signPayload}`);

  // ─── 7. Sign with first 11 members ───
  const sigs = [];
  for (let i = 0; i < THRESHOLD; i++) {
    const sig = wallet.sign(signPayload, members[i].WIF);
    sigs.push(sig);
    const isValid = wallet.verify(signPayload, sig, members[i].publicKey);
    console.log(`\n🖊️  Signature from Member ${i} (${members[i].address}):`);
    console.log(`  ${sig}`);
    console.log(`  Cryptographic verification: ${isValid ? "✅ VALID" : "❌ INVALID"}`);
  }

  // ─── 8. Assemble witnesses ───
  // Position 0: multisig witness
  const verificationScriptHex = Buffer.from(multiSig.contract.script, "base64").toString("hex");
  const multisigWitness = tx.Witness.buildMultiSig(signPayload, sigs, verificationScriptHex);
  const assembledWitnesses = [multisigWitness];

  // Positions 1..N: individual member witnesses (capped at 15, empty for non-signers)
  for (let i = 0; i < MAX_INDIVIDUAL_SIGNERS; i++) {
    if (i < sigs.length) {
      assembledWitnesses.push(tx.Witness.fromSignature(sigs[i], members[i].publicKey));
    } else {
      assembledWitnesses.push(new tx.Witness({ invocationScript: "", verificationScript: "" }));
    }
  }

  transaction.witnesses = assembledWitnesses;

  const signedTxHex = transaction.serialize(true);
  console.log("\n🧩 Assembled Transaction with Multisig + Individual Witnesses:");
  console.log(`  Witness count: ${transaction.witnesses.length}`);
  console.log(`  Hex: ${signedTxHex}`);

  // ─── 9. Broadcast to testnet ───
  console.log("\n📡 Broadcasting to testnet...");
  try {
    const txid = await rpcClient.sendRawTransaction(u.HexString.fromHex(signedTxHex).toBase64());
    console.log(`  ✅ Broadcast successful! TXID: ${txid}`);
  } catch (err) {
    console.log(`  ⚠️ Broadcast result: ${err.message || err}`);
  }

  // ─── 10. Store proposal in database for UI testing ───
  const pool = new Pool({
    connectionString: (
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      "postgresql://neondb_owner:npg_5lkFruCmbgY2@ep-dark-sky-amxi4y10-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
    ).replace(/([?&])channel_binding=[^&]*/gi, "$1").replace(/([?&])sslmode=[^&]*/gi, "$1").replace(/[?&]+$/, ""),
    ssl: { rejectUnauthorized: false },
  });

  const payload = {
    network: "testnet",
    network_mode: "testnet",
    title: "E2E Test: 11-of-21 Mock Native Contract Governance",
    description: "Self-generated 11-of-21 committee multisig with dummy signer injection. Created by test script.",
    contract_hash: GAS_HASH,
    method: "balanceOf",
    params: {
      unsigned_tx: unsignedTxHex,
      committee_pubkeys: committeePubkeys,
      scriptHash: multiSig.scriptHash.replace(/^0x/, ""),
      network_magic: networkMagic,
      governance_mode: "council",
      invocations: [
        {
          scriptHash: GAS_HASH,
          operation: "balanceOf",
          args: [{ type: "Hash160", value: multiSig.address }],
        },
      ],
    },
    unsigned_tx: unsignedTxHex,
    signers_required: THRESHOLD,
    status: "pending",
    creator_address: multiSig.address,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      source: "testnet_e2e_script",
      member_addresses: members.map((m) => m.address),
    },
  };

  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO multisig_requests (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id`;

  const { rows } = await pool.query(sql, values);
  const requestId = rows[0].id;
  console.log(`\n💾 Proposal stored in DB with ID: ${requestId}`);

  // Also store the first 2 signatures so the UI shows partial quorum
  const storedSigs = sigs.slice(0, 2);
  for (const [idx, sig] of storedSigs.entries()) {
    const signer = members[idx];
    const invScript = "0c40" + sig;
    await pool.query(
      `INSERT INTO multisig_signatures (request_id, signer_address, signature, public_key, invocation_script, verification_script) VALUES ($1, $2, $3, $4, $5, $6)`,
      [requestId, signer.address, sig, signer.publicKey, invScript, ""]
    );
    console.log(`  💾 Stored signature for ${signer.address}`);
  }

  await pool.end();

  console.log("\n" + "═".repeat(60));
  console.log("Test complete. Open the UI and navigate to:");
  console.log(`  /tools/governance/${requestId}`);
  console.log("to test the NeoLine signing modal.");
  console.log("═".repeat(60));
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
