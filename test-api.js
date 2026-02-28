const { default: axios } = require('axios');
async function run() {
  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetNNSList',
      params: { Limit: 5, Skip: 0 }
    });
    console.log("GetNNSList:", data.result);
  } catch(e) {}
  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetNnsList',
      params: { Limit: 5, Skip: 0 }
    });
    console.log("GetNnsList:", data.result);
  } catch(e) {}
  
  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetDomains',
      params: { Limit: 5, Skip: 0 }
    });
    console.log("GetDomains:", data.result);
  } catch(e) {}
}
run();
