const fs = require('fs');
let code = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');

code = code.replace(/const vmState = computed\(\(\) => String\(props\.tx\?\.vmstate \|\| ""\)\.toUpperCase\(\)\);/, `const vmState = computed(() => {
  const state = props.tx?.vmstate || props.tx?.VMState;
  if (!state) return "HALT"; // Assume HALT for NeoTube lists unless FAULT is specified
  return String(state).toUpperCase();
});`);

fs.writeFileSync('src/components/common/TxListItem.vue', code);
