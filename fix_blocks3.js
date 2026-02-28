const fs = require('fs');

let file = fs.readFileSync('src/views/Block/Blocks.vue', 'utf8');

// I made a mistake in the previous regex replace of fix_blocks.js, it replaced the wrong target
// Let's manually inject the `useCommittee` instantiation

file = file.replace(/const \{ getPrimaryNodeName \} = useCommittee\(\);\n/, '');

const target = `const { 
  currentPage,
  pageSize,
  totalPages,`;

file = file.replace(target, `const { getPrimaryNodeName } = useCommittee();\n\nconst { \n  currentPage,\n  pageSize,\n  totalPages,`);

fs.writeFileSync('src/views/Block/Blocks.vue', file);

let comm = fs.readFileSync('src/composables/useCommittee.js', 'utf8');
comm = comm.replace('import { ref, computed } from "vue";', 'import { ref } from "vue";');
fs.writeFileSync('src/composables/useCommittee.js', comm);

