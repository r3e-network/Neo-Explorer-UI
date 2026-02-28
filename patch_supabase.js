const fs = require('fs');

let code = fs.readFileSync('src/services/supabaseService.js', 'utf8');

const targetStr = `.single();`;

// Supabase .single() throws an HTTP 406 Not Acceptable if 0 rows are returned
// The recommended pattern for optional queries is to use .maybeSingle() instead.
const newStr = `.maybeSingle();`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/services/supabaseService.js', code);
