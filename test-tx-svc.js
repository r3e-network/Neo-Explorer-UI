const { transactionService } = require('./src/services/index.js');
async function test() {
  try {
    const res = await transactionService.getList(6, 0);
    console.log("Success:", res?.result?.length);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
