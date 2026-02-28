const { wallet } = require('@cityofzion/neon-js');
const { scriptHashToAddress } = require('./src/utils/neoHelpers.js');

// Can't run ES modules easily with require, let's just see neon-js
try {
  console.log(new wallet.Account('Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf').address);
} catch (e) {
  console.log(e.message);
}
