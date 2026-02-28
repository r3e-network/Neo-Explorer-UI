const fs = require('fs');

let code = fs.readFileSync('src/views/Tools/GasEstimatorTool.vue', 'utf8');

const targetHtml = `<div class="space-y-2">
            <label class="block text-sm font-semibold text-high">Transaction Script (Base64 or Hex)</label>
            <textarea v-model="scriptInput" class="form-input w-full h-32 bg-surface text-high font-mono text-sm" placeholder="Paste your raw transaction payload script here..."></textarea>
          </div>`;

const newHtml = `<div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-semibold text-high">Transaction Script</label>
              <select v-model="scriptFormat" class="form-input bg-surface text-xs py-1 px-2 h-auto">
                <option value="base64">Base64</option>
                <option value="hex">Hex String</option>
              </select>
            </div>
            <textarea v-model="scriptInput" class="form-input w-full h-32 bg-surface text-high font-mono text-sm" placeholder="Paste your raw transaction payload script here..."></textarea>
          </div>`;
          
code = code.replace(targetHtml, newHtml);

if (!code.includes('const scriptFormat = ref("base64");')) {
    code = code.replace('const scriptInput = ref("");', 'const scriptFormat = ref("base64");\nconst scriptInput = ref("");');
}

const targetScript = `    let hexScript = "";
    if (/^[0-9a-fA-F]+$/.test(input) || input.startsWith('0x')) {
      hexScript = input.replace(/^0x/, '');
    } else {
      hexScript = u.base642hex(input);
    }`;

const newScript = `    let hexScript = "";
    if (scriptFormat.value === "hex") {
      hexScript = input.replace(/^0x/, '');
    } else {
      hexScript = u.base642hex(input);
    }`;

code = code.replace(targetScript, newScript);
fs.writeFileSync('src/views/Tools/GasEstimatorTool.vue', code);
