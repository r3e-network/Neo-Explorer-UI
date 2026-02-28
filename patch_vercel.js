const fs = require('fs');

let config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

// Insert the new route before the filesystem handler
const routes = config.routes;
const fsIdx = routes.findIndex(r => r.handle === 'filesystem');

routes.splice(fsIdx, 0, {
  "src": "/neotube-api/(.*)",
  "dest": "https://api.neotube.io/$1"
});

fs.writeFileSync('vercel.json', JSON.stringify(config, null, 2));
