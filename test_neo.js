const { rpc } = require('@cityofzion/neon-js');
async function test() {
  const rpcClient = new rpc.RPCClient('https://mainnet1.neo.coz.io:443');
  const neoHash = '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5';
  console.log(await rpcClient.invokeFunction(neoHash, 'unclaimedGas', []));
}
test();
