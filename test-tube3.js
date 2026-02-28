const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.get('https://neotube.io/api/mainnet/transactions?page=1');
  console.log(data.data.items[0]);
}
run();
