const fs = require('fs');

let code = fs.readFileSync('src/services/executionService.js', 'utf8');

// See if amount extraction handles decoded state correctly
const extractSnippet = code.match(/_extractTransferFields\(operationType, decodedParams, hash, manifest\) \{[\s\S]*?\n    \},/);
if (extractSnippet) {
  console.log(extractSnippet[0]);
}

