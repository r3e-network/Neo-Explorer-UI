const { contractService } = require('./src/services/index.js');

async function test() {
  const c = await contractService.getByHash("0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5");
  console.log("Contract:", c?.name);
}
test();
