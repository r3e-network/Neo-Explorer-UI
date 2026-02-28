const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/StorageInspectorTool.vue', 'utf8');

const targetStr = `const intResult = computed(() => {
  if (!hexResult.value) return "0";
  try {
    // Neo integers are little-endian in storage
    const reversedHex = u.reverseHex(hexResult.value);
    // Neon-js BigInteger wrapper or just standard parse
    // For simplicity, handle small to medium integers
    return BigInt('0x' + (reversedHex || '0')).toString();
  } catch (e) {
    return "Invalid Integer";
  }
});`;

const newStr = `const intResult = computed(() => {
  if (!hexResult.value) return "0";
  try {
    // Neo integers are little-endian in storage
    const reversedHex = u.reverseHex(hexResult.value);
    return u.BigInteger.fromTwos(reversedHex).toString();
  } catch (e) {
    return "Invalid Integer";
  }
});`;

code = code.replace(targetStr, newStr);

// Also format hex output to have 0x prefix if user wants, but raw hex is fine. I'll just add 0x prefix dynamically to be professional.
const targetHexStr = `                    <p class="text-sm text-high font-mono break-all">{{ hexResult }}</p>`;
const newHexStr = `                    <p class="text-sm text-high font-mono break-all">{{ hexResult ? '0x' + hexResult : '' }}</p>`;
code = code.replace(targetHexStr, newHexStr);

fs.writeFileSync('src/views/Tools/StorageInspectorTool.vue', code);
