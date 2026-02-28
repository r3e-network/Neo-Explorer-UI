const { default: axios } = require('axios');
async function run() {
  const { data } = await axios.get('https://dora.coz.io/api/v1/neo3/mainnet/contracts/1?limit=100');
  console.log(data);
}
run();
