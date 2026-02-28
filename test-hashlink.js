const { default: axios } = require('axios');
async function run() {
  const hash = '0xd2a4cff31913016155e38e474a2c06d08be276cf'; // GAS
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetContractByContractHash',
    params: { ContractHash: hash }
  });
  console.log(data.result.name);
}
run();
