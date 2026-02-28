const fs = require('fs');

let code = fs.readFileSync('src/services/neotubeService.js', 'utf8');
code = code.replace(
    'const DEFAULT_BASE_URL = "https://api.neotube.io/v1";',
    'const DEFAULT_BASE_URL = "/neotube-api/v1";'
);
fs.writeFileSync('src/services/neotubeService.js', code);

let envCode = fs.readFileSync('.env.example', 'utf8');
if (!envCode.includes('VITE_NEOTUBE_API_BASE_URL')) {
    envCode += '\\n# VITE_NEOTUBE_API_BASE_URL=/neotube-api/v1\\n';
    fs.writeFileSync('.env.example', envCode);
}
