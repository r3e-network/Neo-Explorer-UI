const fs = require('fs');

let code = fs.readFileSync('src/services/supabaseService.js', 'utf8');

// Replace all single() with maybeSingle() globally to prevent HTTP 406
code = code.replace(/\.single\(\)/g, '.maybeSingle()');

fs.writeFileSync('src/services/supabaseService.js', code);
