const fs = require('fs');

let file = fs.readFileSync('src/views/NNS/NNS.vue', 'utf8');

const oldAlert = `<div v-else class="mt-4 space-y-3 p-4 bg-surface-muted rounded-xl border border-line-soft">`;
const newAlert = `<div v-else class="mt-4 space-y-4 p-5 bg-surface-muted rounded-xl border border-line-soft">`;
file = file.replace(oldAlert, newAlert);

const oldRow = `<div class="flex items-center justify-between gap-4 text-sm">`;
const newRow = `<div class="flex items-center justify-between gap-4 text-sm border-b border-line-soft pb-3 last:border-0 last:pb-0">`;
file = file.replace(/<div class="flex items-center justify-between gap-4 text-sm">/g, newRow);

fs.writeFileSync('src/views/NNS/NNS.vue', file);
