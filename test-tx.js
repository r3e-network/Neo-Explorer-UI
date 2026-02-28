const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetTransactionList',
    params: { Limit: 2, Skip: 0 }
  });
  const tx = data.result.result[0];
  const net = Number(tx.netfee ?? tx.net_fee ?? 0);
  const sys = Number(tx.sysfee ?? tx.sys_fee ?? 0);
  const total = net + sys;
  console.log("net:", net, "sys:", sys, "total:", total);
  console.log("total / 1e8:", (total / 100000000).toFixed(5));
}
run();
