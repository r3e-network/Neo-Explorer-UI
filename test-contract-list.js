const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetContractList',
    params: { Limit: 20, Skip: 0 }
  });
  const c = data.result.result.find(c => c.totalsccall !== undefined || c.invocations !== undefined);
  console.log(c ? 'Found: ' + Object.keys(c) : 'Not found');
}
run();
