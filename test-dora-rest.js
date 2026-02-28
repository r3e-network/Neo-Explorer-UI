const { default: axios } = require('axios');
async function run() {
  try {
    const { data } = await axios.get('https://dora.coz.io/api/v1/neo3/mainnet/blocks/1');
    console.log("Success:", data);
  } catch(e) {
    console.log("Error:", e.message, e.response?.data);
  }
}
run();
