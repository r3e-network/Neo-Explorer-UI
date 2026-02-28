const { default: axios } = require('axios');

async function check(hash) {
  try {
    const { data } = await axios.post('https://neofura.ngd.network', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetContractByContractHash',
      params: { ContractHash: hash }
    });
    console.log(hash, '->', data.result?.name || 'Not Found');
  } catch (e) {
    console.log(hash, '-> Error');
  }
}

async function run() {
  await check('0xac51c363e981be719e2ece60795781b84afc4da405d06ae6410fa42906994b60'); // This is a TX hash, wait
  await check('0xcc5e4edd9f5f8dba8bb65734541df7a1c081c67b'); // native contract
}
run();
