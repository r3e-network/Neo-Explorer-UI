const fs = require('fs');

let file = fs.readFileSync('tests/components/BlockListItem.spec.js', 'utf8');

file = file.replace(`getPrimaryNodeName: vi.fn((idx) => \`Unknown Validator\`),`, `resolvePrimaryIndex: vi.fn((b) => b.primary),\n    getPrimaryNodeName: vi.fn((idx) => \`Unknown Validator\`),`);

fs.writeFileSync('tests/components/BlockListItem.spec.js', file);
