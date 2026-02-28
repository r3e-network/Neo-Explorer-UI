const fs = require('fs');

let config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

// Web3Auth uses popup windows to handle the OAuth redirect flow.
// If the parent window has strict Cross-Origin-Opener-Policy (COOP) headers,
// the parent window cannot communicate with the child popup to receive the authentication token,
// leading to the "Cross-Origin-Opener-Policy policy would block the window.closed call" error.

if (!config.headers) {
  config.headers = [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin-allow-popups"
        }
      ]
    }
  ];
  fs.writeFileSync('vercel.json', JSON.stringify(config, null, 2));
  console.log("Patched vercel.json with COOP headers");
}
