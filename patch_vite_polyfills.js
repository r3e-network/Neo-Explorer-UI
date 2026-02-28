const fs = require('fs');

let code = fs.readFileSync('vite.config.js', 'utf8');

const importTarget = `import compression from "vite-plugin-compression";`;
const newImport = `import compression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";`;

code = code.replace(importTarget, newImport);

const pluginTarget = `vue(),`;
const newPlugin = `vue(),
      nodePolyfills({
        include: ["buffer", "crypto", "stream", "util", "events", "process"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),`;

code = code.replace(pluginTarget, newPlugin);
fs.writeFileSync('vite.config.js', code);
