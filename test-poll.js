const { default: axios } = require('axios');
async function run() {
  for (let i = 0; i < 5; i++) {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetBlockInfoList',
      params: { Limit: 1, Skip: 0 }
    });
    const block = data.result.result[0];
    console.log(`Block ${block.index} time:`, block.timestamp, 'Now:', Date.now(), 'Diff:', Date.now() - block.timestamp);
    await new Promise(r => setTimeout(r, 5000));
  }
}
run();
