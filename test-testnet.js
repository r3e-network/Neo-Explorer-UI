const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://testnet1.neo.coz.io:443', {
    jsonrpc: '2.0',
    id: 1,
    method: 'getblock',
    params: [10000, 1]
  });
  console.log('Testnet getblock: ', data.result.time);
}
run();
