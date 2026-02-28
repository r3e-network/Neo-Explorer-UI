const fs = require('fs');

// 1. blockService.js
let service = fs.readFileSync('src/services/blockService.js', 'utf8');
service = service.replace(
  `const missingConsensus = b.nextconsensus === undefined && b.nextConsensus === undefined;`,
  `const missingConsensus = b.nextconsensus === undefined && b.nextConsensus === undefined;\n          const missingPrimary = b.primary === undefined;`
);
service = service.replace(
  `if (enrichMissingFields && (missingFees || missingNetFee || missingConsensus)) {`,
  `if (enrichMissingFields && (missingFees || missingNetFee || missingConsensus || missingPrimary)) {`
);
fs.writeFileSync('src/services/blockService.js', service);

// 2. HomePage.vue
let home = fs.readFileSync('src/views/Home/HomePage.vue', 'utf8');
home = home.replace(
  `const missingConsensus = !block.nextconsensus && !block.nextConsensus && !block.speaker && !block.validator;`,
  `const missingConsensus = !block.nextconsensus && !block.nextConsensus && !block.speaker && !block.validator;\n    const missingPrimary = block.primary === undefined;`
);
home = home.replace(
  `return missingConsensus || missingFees || missingNetFee;`,
  `return missingConsensus || missingFees || missingNetFee || missingPrimary;`
);
fs.writeFileSync('src/views/Home/HomePage.vue', home);

// 3. Blocks.vue
let blocks = fs.readFileSync('src/views/Block/Blocks.vue', 'utf8');
blocks = blocks.replace(
  `const blockFetchFn = (limit, skip, opts) => blockService.getList(limit, skip, opts);`,
  `const blockFetchFn = (limit, skip, opts) => blockService.getList(limit, skip, { ...opts, enrichMissingFields: true });`
);
fs.writeFileSync('src/views/Block/Blocks.vue', blocks);

