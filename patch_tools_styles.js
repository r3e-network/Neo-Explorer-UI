const fs = require('fs');

let file = fs.readFileSync('src/views/Tools/MultiSigTool.vue', 'utf8');

// The original UI used Tailwind classes that aren't perfectly aligning with the "Neo Explorer" specific components (like `card-header`, `list-row`, etc. we use elsewhere). Let's make sure it looks like the rest.

const oldHeader = `<div class="mb-6 flex items-center justify-between gap-4">`;
const newHeader = `<div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">`;
file = file.replace(oldHeader, newHeader);

const oldStatus = `<span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">`;
const newStatus = `<span class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">`;
file = file.replace(oldStatus, newStatus);

// Let's add hover transition classes to buttons
const oldCancelBtn = `class="px-4 py-2 text-sm font-medium text-mid hover:text-high"`;
const newCancelBtn = `class="px-4 py-2 text-sm font-medium text-mid hover:text-high transition-colors"`;
file = file.replace(oldCancelBtn, newCancelBtn);

const oldCreateBtn = `class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm"`;
const newCreateBtn = `class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors active:scale-95"`;
file = file.replace(oldCreateBtn, newCreateBtn);

fs.writeFileSync('src/views/Tools/MultiSigTool.vue', file);

let toolsIndex = fs.readFileSync('src/views/Tools/ToolsIndex.vue', 'utf8');
toolsIndex = toolsIndex.replace('bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300', 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300');

fs.writeFileSync('src/views/Tools/ToolsIndex.vue', toolsIndex);
