const { default: axios } = require('axios');
async function run() {
  const hash = "0xcfa0b6b8f99ff03cd67a08a33247aaaa068211c4";
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetContractByContractHash',
    params: { ContractHash: hash }
  });
  console.log(JSON.stringify(data.result, null, 2));
}
run();
