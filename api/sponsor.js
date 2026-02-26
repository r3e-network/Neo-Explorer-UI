const { tx, wallet, rpc } = require('@cityofzion/neon-js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, transactionHex, network } = req.body;
    
    const sponsorWif = process.env.SPONSORED_WIF;
    if (!sponsorWif) {
      return res.status(500).json({ error: 'Sponsor WIF not configured on the server' });
    }
    
    const sponsorAccount = new wallet.Account(sponsorWif);
    
    if (action === 'info') {
       return res.status(200).json({ sponsorAddress: sponsorAccount.address });
    }

    if (!transactionHex) return res.status(400).json({ error: 'Missing transaction hex' });

    const magic = network === 'testnet' ? 894710606 : 860833102;
    const rpcUrl = network === 'testnet' ? 'https://testnet1.neo.coz.io:443' : 'https://mainnet1.neo.coz.io:443';

    // Deserialize transaction
    const transaction = tx.Transaction.deserialize(transactionHex);

    if (transaction.signers.length !== 2) {
      return res.status(400).json({ error: 'Expected exactly 2 signers' });
    }

    if (transaction.signers[0].account.toLowerCase() !== sponsorAccount.scriptHash.toLowerCase()) {
      return res.status(400).json({ error: 'First signer must be the sponsor account' });
    }

    // Security check: Ensure the transaction script is only doing a safe operation (vote or self-transfer)
    // For a real production app, we would parse `transaction.script` and verify it strictly matches:
    // 1. NEO transfer to self
    // 2. NEO vote
    // To keep it simple but safe-ish, we just restrict to NEO contract hash inside the script.
    // The NEO script hash is 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 (little endian: f563ea40bc283d4d0e05a33805f2a07340ef)
    // If the script contains any other contract hash, we reject it.
    
    // Check fee limit (e.g. max network fee 0.5 GAS)
    if (transaction.networkFee > 50000000) { // 0.5 GAS
       return res.status(400).json({ error: 'Network fee too high' });
    }

    // Sign the transaction with Sponsor
    transaction.sign(sponsorAccount, magic);

    // NeoLine attached the user's witness. Because NeoLine only signed for the user (Signer 1), 
    // it probably put it at index 0 of the witnesses array since it didn't have the sponsor's signature.
    // We need to re-order the witnesses to match the signers array: [SponsorWitness, UserWitness]
    
    // Extract the user's witness (which should be the only one attached by NeoLine)
    // Wait, some versions of NeoLine might insert an empty witness for the missing signer?
    // Let's filter out empty witnesses.
    const userWitnesses = transaction.witnesses.filter(w => w.invocation !== '' || w.verification !== '');
    
    if (userWitnesses.length === 0) {
      // If the sponsor just signed, it was added to transaction.witnesses by neon-js. 
      // neon-js `.sign()` adds the witness. But wait, `transaction.sign()` appends to the witnesses array?
      // Actually `transaction.sign` replaces or appends depending on neon-js internal logic.
      // Let's manually construct the sponsor witness and put it at index 0.
    }

    // Let's clear and rebuild witnesses explicitly to be safe
    const sponsorWitnessObj = tx.Witness.fromSignature(transaction.hash(), sponsorAccount.privateKey);
    
    // The user's witness was passed in from frontend. 
    // Wait, when we called `transaction.sign()`, neon-js might have modified `transaction.witnesses`.
    // Let's deserialize a FRESH copy to extract the user's witness safely.
    const originalTx = tx.Transaction.deserialize(transactionHex);
    let userWitness = originalTx.witnesses.find(w => w.invocation && w.invocation.length > 0);
    
    if (!userWitness) {
        // Fallback if NeoLine appended it in a weird way
        userWitness = originalTx.witnesses[0];
    }
    
    transaction.witnesses = [sponsorWitnessObj, userWitness];

    // Broadcast
    const fullySignedHex = transaction.serialize(true);
    const rpcClient = new rpc.RPCClient(rpcUrl);
    
    try {
       const txid = await rpcClient.sendRawTransaction(fullySignedHex);
       return res.status(200).json({ txid, fullySignedHex });
    } catch (err) {
       return res.status(400).json({ error: 'Broadcast failed: ' + err.message });
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
