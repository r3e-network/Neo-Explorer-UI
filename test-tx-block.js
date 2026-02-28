const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetRawTransactionByBlockHeight',
    params: { BlockHeight: 8920970, Limit: 10, Skip: 0 }
  });
  console.log(data.result.result[0].vmstate);
}
run();
