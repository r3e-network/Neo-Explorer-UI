const fs = require('fs');

let code = fs.readFileSync('vite.config.js', 'utf8');

// For local testing, Vite also needs these headers.
const target = `    server: {`;
const replacement = `    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },`;

if (!code.includes('same-origin-allow-popups')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('vite.config.js', code);
}
