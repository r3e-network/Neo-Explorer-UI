const { default: axios } = require('axios');
async function run() {
  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetAssetInfoByContractHash',
      params: { ContractHash: '0x50ac1c37690cc2cfc594472833cf57505d5f46de' }
    });
    console.log("GetAssetInfoByContractHash:", data.result);
  } catch(e) { console.log(e.message) }

  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 2,
      method: 'GetTokensByContractHash',
      params: { ContractHash: '0x50ac1c37690cc2cfc594472833cf57505d5f46de', Limit: 5, Skip: 0 }
    });
    console.log("GetTokensByContractHash:", data.result);
  } catch(e) { console.log(e.message) }
  
  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 3,
      method: 'GetNep11PropertiesByContractHash',
      params: { ContractHash: '0x50ac1c37690cc2cfc594472833cf57505d5f46de', Limit: 5, Skip: 0 }
    });
    console.log("GetNep11PropertiesByContractHash:", data.result);
  } catch(e) { console.log(e.message) }
}
run();
