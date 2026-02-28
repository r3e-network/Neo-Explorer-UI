const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetTransactionList',
    params: { Limit: 2, Skip: 0 }
  });
  console.log(data.result.result[0].vmstate);
}
run();
