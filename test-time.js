const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetBlockList',
    params: { Limit: 1, Skip: 0 }
  });
  console.log(JSON.stringify(data, null, 2), Date.now());
}
run();
