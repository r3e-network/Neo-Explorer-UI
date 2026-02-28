const fs = require('fs');

let code = fs.readFileSync('src/composables/useCommittee.js', 'utf8');

const targetStr = `  async function loadCommittee() {
    if (initialized.value) return;
    initialized.value = true;`;

const newStr = `  async function loadCommittee(force = false) {
    if (initialized.value && !force) return;
    initialized.value = true;`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/composables/useCommittee.js', code);
