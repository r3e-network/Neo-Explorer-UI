const fs = require('fs');
const { rpc, tx, sc, wallet, u } = require('@cityofzion/neon-js');

async function main() {
    const rpcUrl = 'https://testnet1.neo.coz.io:443';
    const rpcClient = new rpc.RPCClient(rpcUrl);

    const deployerWif = 'Kx2BeyUv1dBr99QtjrRsE7xxQqcHHZJmEWXvV8ivyShgWq7BbA4U';
    const account = new wallet.Account(deployerWif);

    const nefPath = 'contracts/AbstractAccount/bin/sc/TestECDSA.nef';
    const manifestPath = 'contracts/AbstractAccount/bin/sc/TestECDSA.manifest.json';
    
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

    transaction.sign(account, 894710606);

    console.log("Deploying TestECDSA...");
    const txid = await rpcClient.sendRawTransaction(transaction.serialize(true));
    console.log("TxId:", txid);
}

main().catch(console.error);
