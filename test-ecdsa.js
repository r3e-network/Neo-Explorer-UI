const fs = require('fs');
const { rpc, sc, u } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');

async function main() {
    const nefHex = fs.readFileSync('contracts/AbstractAccount/bin/sc/TestECDSA.nef').toString('hex');
    const rpcClient = new rpc.RPCClient('https://testnet1.neo.coz.io:443');

    // Create a 66 byte message
    const message = u.HexString.fromHex('1901' + '00'.repeat(64)).toRawBytes();

    // Valid pubkey
    const evmWallet = ethers.Wallet.createRandom();
    const pkStr = evmWallet.signingKey.publicKey.slice(2);
    
    // Compress pubkey (C# logic)
    const pkBytes = Buffer.from(pkStr, 'hex');
    const compressed = new Uint8Array(33);
    compressed[0] = pkBytes[64] % 2 === 0 ? 0x02 : 0x03;
    for (let i = 0; i < 32; i++) compressed[i+1] = pkBytes[i+1];
    
    // valid signature length 64
    const signature = new Uint8Array(64);

    const sb = new sc.ScriptBuilder();
    // emit app call directly to the nef's script? 
    // We can't emitAppCall without deploying.
    // BUT we can use sc.createScript with the NEF script itself!
    // No, we can just load the NEF script and append arguments, or build a script that invokes it.
    
    // Easy way: pass the contract script directly to invokeScript!
    // But how to pass arguments to a raw script?
    // We push args in reverse order, then push the script.
    
    const nef = sc.NEF.fromBuffer(Buffer.from(nefHex, 'hex'));
    
    const sb2 = new sc.ScriptBuilder();
    sb2.emitPush(sc.ContractParam.byteArray(u.HexString.fromHex(Buffer.from(signature).toString('hex'))));
    sb2.emitPush(sc.ContractParam.byteArray(u.HexString.fromHex(Buffer.from(compressed).toString('hex'))));
    sb2.emitPush(sc.ContractParam.byteArray(u.HexString.fromHex(Buffer.from(message).toString('hex'))));
    sb2.emitPush(sc.ContractParam.string("testVerify"));
    // Since we didn't deploy, we invoke it as a raw script.
    // A C# contract expects method name as first argument, then an array of args if it's compiled as a smart contract.
    // Actually, nccs generates a dispatcher.
    sb2.emitPush(sc.ContractParam.array([
       sc.ContractParam.byteArray(u.HexString.fromHex(Buffer.from(message).toString('hex'))),
       sc.ContractParam.byteArray(u.HexString.fromHex(Buffer.from(compressed).toString('hex'))),
       sc.ContractParam.byteArray(u.HexString.fromHex(Buffer.from(signature).toString('hex')))
    ]));
    sb2.emitPush(sc.ContractParam.string("testVerify"));
    
    // Just append the NEF script to evaluate it.
    const finalScript = sb2.build() + nef.script;
    
    const res = await rpcClient.invokeScript(finalScript, []);
    console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
