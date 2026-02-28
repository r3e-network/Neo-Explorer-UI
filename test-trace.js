const { default: axios } = require('axios');

async function testTrace(hash) {
  try {
    const { data } = await axios.post('https://dora.coz.io/api/v1/neo3/mainnet', {
      jsonrpc: '2.0',
      id: 1,
      method: 'GetApplicationLogByTransactionHash',
      params: { TransactionHash: hash }
    });
    console.log(data);
  } catch(e) {
    console.log(e.message);
  }
}

testTrace('0xac51c363e981be719e2ece60795781b84afc4da405d06ae6410fa42906994b60');
