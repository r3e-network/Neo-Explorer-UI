const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.get('https://api.neotube.io/v1/mainnet/txs?page=1');
  console.log(data.data.items[0]);
}
run();
