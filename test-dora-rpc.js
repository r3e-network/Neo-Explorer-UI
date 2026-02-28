const { default: axios } = require('axios');
async function run() {
  try {
    const { data } = await axios.post('https://mainnet1.neo.coz.io:443', {
      jsonrpc: '2.0',
      id: 1,
      method: 'getblockcount',
      params: []
    });
    console.log("Success:", data);
  } catch(e) {
    console.log("Error:", e.message, e.response?.data);
  }
}
run();
