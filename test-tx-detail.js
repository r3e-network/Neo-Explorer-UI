const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetRawTransactionByTransactionHash',
    params: { TransactionHash: '0xac51c363e981be719e2ece60795781b84afc4da405d06ae6410fa42906994b60' }
  });
  console.log(Object.keys(data.result));
}
run();
