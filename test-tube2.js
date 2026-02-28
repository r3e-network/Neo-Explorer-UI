const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.get('https://neotube.io/api/v1/neo3/mainnet/txs?page=1');
  console.log(data);
}
run();
