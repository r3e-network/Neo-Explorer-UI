const fs = require('fs');
const path = require('path');
const { rpc, tx, sc, wallet, u } = require('@cityofzion/neon-js');

async function main() {
    const rpcUrl = process.env.RPC_URL || 'https://testnet1.neo.coz.io:443';
    const rpcClient = new rpc.RPCClient(rpcUrl);

    const deployerWif = process.env.TEST_ECDSA_DEPLOYER_WIF || process.env.DEPLOYER_WIF || '';
    if (!deployerWif) throw new Error('Missing TEST_ECDSA_DEPLOYER_WIF or DEPLOYER_WIF');
    const account = new wallet.Account(deployerWif);

    const repoRoot = path.resolve(__dirname, '..', '..');
    const nefPath = path.join(repoRoot, 'contracts', 'AbstractAccount', 'bin', 'sc', 'TestECDSA.nef');
    const manifestPath = path.join(repoRoot, 'contracts', 'AbstractAccount', 'bin', 'sc', 'TestECDSA.manifest.json');
    
    const nef = fs.readFileSync(nefPath);
    const manifestStr = fs.readFileSync(manifestPath, 'utf8');

    const sb = new sc.ScriptBuilder();
    sb.emitAppCall("fffdc93764dbaddd97c48f252a53ea4643faa3fd", "deploy", [
        sc.ContractParam.byteArray(nef.toString('hex')),
        sc.ContractParam.string(manifestStr)
    ]);
    const script = sb.build();

    const currentHeight = await rpcClient.getBlockCount();
    const transaction = new tx.Transaction({
        signers: [{ account: account.scriptHash, scopes: tx.WitnessScope.Global }],
        validUntilBlock: currentHeight + 1000,
        systemFee: 1000000000, // 10 GAS
        networkFee: 1000000000, // 10 GAS
        script: script
    });

    const versionRes = await rpcClient.execute(new rpc.Query({ method: "getversion" }));
    const magic = versionRes.protocol.network;
    transaction.sign(account, magic);

    console.log("Deploying TestECDSA...");
    const txid = await rpcClient.sendRawTransaction(transaction.serialize(true));
    console.log("TxId:", txid);
}

main().catch(console.error);
