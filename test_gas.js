const { rpc } = require('@cityofzion/neon-js');
async function test() {
  const c = new rpc.RPCClient('https://mainnet1.neo.coz.io:443');
  const res = await c.invokeFunction('0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5', 'symbol', []);
  console.log(res);
}
test();
