const { default: axios } = require('axios');
async function run() {
  const hash = "0xfffdc93764dbaddd97c48f252a53ea4643faa3fd"; // NEO token contract hash
  const { data } = await axios.post('https://neofura.ngd.network', {
    jsonrpc: '2.0',
    id: 1,
    method: 'GetContractByContractHash',
    params: { ContractHash: hash }
  });
  console.log(JSON.stringify(data.result, null, 2));
}
run();
