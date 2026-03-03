const { rpc, sc, u, tx, wallet } = require('@cityofzion/neon-js');
async function main() {
    const aaHash = String(process.env.AA_HASH_TESTNET || process.env.VITE_AA_HASH_TESTNET || '49c095ce04d38642e39155f5481615c58227a498')
      .replace(/^0x/i, '')
      .toLowerCase();
    const rpcUrl = 'https://testnet1.neo.coz.io:443';
    const rpcClient = new rpc.RPCClient(rpcUrl);
    
    const accountId = '047001176b57162921f3eb478cf9b8bb5a65a53630bd6a910ebca4e39492e5635fbe5ef3e107e9ea5b7a3c4f70c231a22cdc5a3360ac1e16ec73d8ac0956e5ec19';
    const argsParam = [sc.ContractParam.byteArray(u.HexString.fromHex(accountId, true)), sc.ContractParam.hash160(aaHash)];

    const argsScript = sc.createScript({
        scriptHash: aaHash,
        operation: 'computeArgsHash',
        args: [
            { type: 'Array', value: argsParam }
        ]
    });
    const argsRes = await rpcClient.invokeScript(u.HexString.fromHex(argsScript, true), []);
    console.log(JSON.stringify(argsRes, null, 2));
}
main();
