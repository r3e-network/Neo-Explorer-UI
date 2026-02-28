const { rpc } = require('@cityofzion/neon-js');

async function test() {
  const client = new rpc.RPCClient('https://mainnet1.neo.coz.io:443');
  try {
    const mempool = await client.execute(new rpc.Query({ method: 'getrawmempool', params: [true] }));
    console.log(mempool);
    const count = await client.getBlockCount();
    console.log("Block count:", count);
  } catch (err) {
    console.error(err);
  }
}

test();