const fs = require('fs');

let code = fs.readFileSync('src/components/common/HashLink.vue', 'utf8');

code = code.replace(/<img v-if="knownLogo" :src="knownLogo" class="w-3\.5 h-3\.5 rounded-full object-cover bg-white" alt="" \/>/, `<img v-if="knownLogo" :src="knownLogo" class="w-3.5 h-3.5 rounded-full object-cover bg-white" :alt="knownName" />`);

// Remove "if (known && known.name) return known.name; } return null;" in knownName to make room
code = code.replace(/if \(known && known\.name\) return known\.name;\n  \}\n  return null;\n\}\);/, `if (known && known.name) return known.name;
  }
  return fetchedContractName.value || null;
});`);

const replaceLogoFunc = `const knownLogo = computed(() => {
  if (!props.hash) return null;
  if (props.type === "contract" || props.type === "token") {
    const hash = props.hash.toLowerCase();
    const known = KNOWN_CONTRACTS[hash];
    if (known && known.logo) return known.logo;
    
    // Auto-detect Flamingo contracts by name if we dynamically fetched it
    if (fetchedContractName.value && fetchedContractName.value.toLowerCase().includes('flamingo')) {
      return "https://flamingo.finance/favicon.ico";
    }
  }
  return null;
});`;

code = code.replace(/const knownLogo = computed\(\(\) => \{[\s\S]*?\}\);/, replaceLogoFunc);

fs.writeFileSync('src/components/common/HashLink.vue', code);
