const fs = require('fs');

let code = fs.readFileSync('src/components/common/HashLink.vue', 'utf8');

const regex = /if \(fetchedContractName\.value && fetchedContractName\.value\.toLowerCase\(\)\.includes\('flamingo'\)\) \{\n      return "https:\/\/flamingo\.finance\/favicon\.ico";\n    \}/;

const replacement = `if (fetchedContractName.value) {
      const lowerName = fetchedContractName.value.toLowerCase();
      if (lowerName.includes('flamingo')) {
        return "https://flamingo.finance/favicon.ico";
      }
      if (lowerName.includes('burger')) {
        return "https://app.neoburger.io/favicon.ico";
      }
    }`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/common/HashLink.vue', code);
