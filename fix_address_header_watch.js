const fs = require('fs');
let file = fs.readFileSync('src/views/Account/components/AddressHeader.vue', 'utf8');

const wrongOrder = `const publicTag = ref(null);
watch(() => props.address, async (newAddr) => {
  if (newAddr) {
    const tagData = await supabaseService.getAddressTag(newAddr);
    if (tagData) {
      publicTag.value = tagData.label;
    } else {
      publicTag.value = null;
    }
  }
}, { immediate: true });

const props = defineProps({`;

const correctOrder = `const props = defineProps({`;

const appendWatch = `const publicTag = ref(null);
watch(() => props.address, async (newAddr) => {
  if (newAddr) {
    const tagData = await supabaseService.getAddressTag(newAddr);
    if (tagData) {
      publicTag.value = tagData.label;
    } else {
      publicTag.value = null;
    }
  }
}, { immediate: true });`;

file = file.replace(wrongOrder, correctOrder);

file = file.replace('const props = defineProps({', `const props = defineProps({\n`);
file = file.replace(/const isContract = computed\(\(\) => props\.isContract\);/g, `${appendWatch}\n\nconst isContract = computed(() => props.isContract);`);


fs.writeFileSync('src/views/Account/components/AddressHeader.vue', file);
