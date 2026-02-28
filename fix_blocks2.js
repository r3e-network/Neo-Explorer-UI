const fs = require('fs');

let file = fs.readFileSync('src/views/Block/Blocks.vue', 'utf8');

if (file.includes('const { getPrimaryNodeName } = useCommittee();')) {
  // It is used! Let's check why eslint complains
} else {
  // Eslint complains because we injected the import but forgot to inject the initialization in the setup block or something else.
}
