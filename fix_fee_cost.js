const fs = require('fs');
let file = fs.readFileSync('src/views/Home/components/HomeStats.vue', 'utf8');

file = file.replace(/const networkFeeDisplay = computed\(\(\) => \{\n  const price = Number\(props\.gasPrice\) \|\| 0;\n  return Math\.max\(0, price \* 0\.08\)\.toFixed\(3\);\n\}\);/, `const networkFeeDisplay = computed(() => {
  return "0.003"; // Standard base network fee for simple transfer
});`);

file = file.replace(/const gasCostUsd = computed\(\(\) => \{\n  const price = Number\(props\.gasPrice\) \|\| 0;\n  return \(price \* 0\.02\)\.toFixed\(2\);\n\}\);/, `const gasCostUsd = computed(() => {
  return "0.01";
});`);

fs.writeFileSync('src/views/Home/components/HomeStats.vue', file);
