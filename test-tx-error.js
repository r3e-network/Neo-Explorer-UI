const { default: axios } = require('axios');
async function run() {
  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetTransactionList',
      params: { Limit: 6, Skip: 0 }
    });
    console.log("Success:", data.result.result.length, "transactions");
  } catch(e) {
    console.log("Error:", e.message);
  }
}
run();
