const { default: axios } = require('axios');
async function run() {
  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetNep11TransferByContractHash',
      params: { ContractHash: '0x50ac1c37690cc2cfc594472833cf57505d5f46de', Limit: 5, Skip: 0 }
    });
    console.log("GetNep11TransferByContractHash:", data.result);
  } catch(e) {}
}
run();
