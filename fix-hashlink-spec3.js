const fs = require('fs');
let code = fs.readFileSync('tests/components/HashLink.spec.js', 'utf8');

code = code.replace(/getByHash\.mockImplementationOnce\(async/, 'getByHash.mockImplementation(async');

fs.writeFileSync('tests/components/HashLink.spec.js', code);
