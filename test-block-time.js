const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetBlockInfoList',
    params: { Limit: 1, Skip: 0 }
  });
  const block = data.result.result[0];
  console.log('Block time:', block.timestamp);
  console.log('Date.now():', Date.now());
  console.log('Diff:', Date.now() - block.timestamp);
}
run();
