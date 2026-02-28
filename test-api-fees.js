const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetTransactionList',
    params: { Limit: 2, Skip: 0 }
  });
  console.log("Raw object keys:", Object.keys(data.result.result[0]));
  console.log("netfee:", typeof data.result.result[0].netfee, data.result.result[0].netfee);
  console.log("sysfee:", typeof data.result.result[0].sysfee, data.result.result[0].sysfee);
}
run();
