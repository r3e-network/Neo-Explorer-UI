const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/AbiEncoderTool.vue', 'utf8');

const targetHtml = `<div class="space-y-2">
              <label class="block text-sm font-semibold text-high">Compiled Script (Base64 or Hex)</label>
              <textarea v-model="decodeInput" class="form-input w-full h-32 bg-surface text-high font-mono text-sm" placeholder="Paste raw transaction script payload here..."></textarea>
            </div>`;

const newHtml = `<div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-sm font-semibold text-high">Compiled Script</label>
                <select v-model="decodeFormat" class="form-input bg-surface text-xs py-1 px-2 h-auto">
                  <option value="base64">Base64</option>
                  <option value="hex">Hex String</option>
                </select>
              </div>
              <textarea v-model="decodeInput" class="form-input w-full h-32 bg-surface text-high font-mono text-sm" placeholder="Paste raw transaction script payload here..."></textarea>
            </div>`;

code = code.replace(targetHtml, newHtml);

if (!code.includes('const decodeFormat = ref("base64");')) {
    code = code.replace('const decodeInput = ref("");', 'const decodeFormat = ref("base64");\nconst decodeInput = ref("");');
}

const targetScript = `    // Check if it's hex or base64
    if (/^[0-9a-fA-F]+$/.test(input) || input.startsWith('0x')) {
      // It's hex
      const cleanHex = input.replace(/^0x/, '');
      base64Script = u.hex2base64(cleanHex);
    } else {
      // Assume base64
      base64Script = input;
    }`;

const newScript = `    if (decodeFormat.value === "hex") {
      const cleanHex = input.replace(/^0x/, '');
      base64Script = u.hex2base64(cleanHex);
    } else {
      base64Script = input;
    }`;

code = code.replace(targetScript, newScript);
fs.writeFileSync('src/views/Tools/AbiEncoderTool.vue', code);
