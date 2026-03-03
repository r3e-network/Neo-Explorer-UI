const { rpc, sc, u, tx, wallet } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');

async function main() {
    const rpcUrl = 'https://testnet1.neo.coz.io:443';
    const rpcClient = new rpc.RPCClient(rpcUrl);

    const evmWallet = ethers.Wallet.createRandom();
    const accountIdHex = evmWallet.signingKey.publicKey.slice(2);
    
    // Explicitly create hex payload as byte array using u.HexString
    // But don't use 'true' for Little Endian. 
    // Wait, earlier we found 'true' keeps it FORWARD (in original string order)
    
    const pkBytes = Buffer.from(accountIdHex, 'hex');
    const b64 = pkBytes.toString('base64');
    
    console.log("Length of pkBytes:", pkBytes.length);
    console.log("First byte:", pkBytes[0]);
    console.log("Last byte:", pkBytes[64]);
}

main().catch(console.error);
