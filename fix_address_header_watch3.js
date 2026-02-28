const fs = require('fs');
let file = fs.readFileSync('src/views/Account/components/AddressHeader.vue', 'utf8');

const appendWatch = `\nconst publicTag = ref(null);
watch(() => props.address, async (newAddr) => {
  if (newAddr) {
    const tagData = await supabaseService.getAddressTag(newAddr);
    if (tagData) {
      publicTag.value = tagData.label;
    } else {
      publicTag.value = null;
    }
  }
}, { immediate: true });\n`;

file = file.replace('const nnsName = ref("");', `const nnsName = ref("");${appendWatch}`);

fs.writeFileSync('src/views/Account/components/AddressHeader.vue', file);
