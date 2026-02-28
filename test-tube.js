const { default: axios } = require('axios');
async function run() {
  try {
    const { data } = await axios.get('https://api.neotube.io/v1/nep11/0x50ac1c37690cc2cfc594472833cf57505d5f46de/transfers?page=1', { headers: { network: 'mainnet' } });
    console.log("Tokens:", data.data.items.slice(0, 2));
  } catch(e) { console.log(e.response ? e.response.status : e.message) }

  try {
    const { data } = await axios.get('https://api.neotube.io/v1/nep11/transfers?contract=0x50ac1c37690cc2cfc594472833cf57505d5f46de&page=1', { headers: { network: 'mainnet' } });
    console.log("Tokens 2:", data.data.items.slice(0, 2));
  } catch(e) { console.log(e.response ? e.response.status : e.message) }
  
  try {
    const { data } = await axios.get('https://api.neotube.io/v1/nep11/0x50ac1c37690cc2cfc594472833cf57505d5f46de/tokens?page=1', { headers: { network: 'mainnet' } });
    console.log("Tokens 3:", data.data.items.slice(0, 2));
  } catch(e) { console.log(e.response ? e.response.status : e.message) }
}
run();
