const { tx, wallet, rpc } = require('@cityofzion/neon-js');
async function test() {
  const c = new rpc.RPCClient('https://mainnet1.neo.coz.io:443');
  const acc = new wallet.Account();
  
  const script = 'wh8MBnN5bWJvbAwU9WPqQLwoPU0OBcSOowWz8qBzQO9BYn1bUg==';
  
  let txn = new tx.Transaction({
      signers: [
          { account: acc.scriptHash, scopes: tx.WitnessScope.CalledByEntry }
      ],
      validUntilBlock: 1000,
      script: Buffer.from(script, 'base64').toString('hex')
  });
  
  txn.sign(acc, 860833102);
  const networkFee = await c.calculateNetworkFee(txn);
  console.log("Network fee:", networkFee.toString());
}
test();
