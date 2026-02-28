const fs = require('fs');

let code = fs.readFileSync('src/utils/timeFormat.js', 'utf8');

if (!code.includes('import { getCurrentEnv, NET_ENV }')) {
  code = `import { getCurrentEnv, NET_ENV } from "./env";\n\n` + code;
}

code = code.replace(/export function formatAge\([\s\S]*?\}\n/, `export function formatAge(timestamp, nowMs = Date.now()) {
  if (!timestamp) return "";

  const ts = timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;
  
  const network = getCurrentEnv();
  const delayOffset = network === NET_ENV.TestT5 ? 2 : 10;
  
  const seconds = Math.max(0, Math.floor(nowMs / 1000 - ts) - delayOffset);

  if (seconds === 0) return "just now";
  if (seconds < 60) return \`\${seconds} secs ago\`;
  if (seconds < 3600) return \`\${Math.floor(seconds / 60)} mins ago\`;
  if (seconds < 86400) return \`\${Math.floor(seconds / 3600)} hrs ago\`;
  return \`\${Math.floor(seconds / 86400)} days ago\`;
}`);

fs.writeFileSync('src/utils/timeFormat.js', code);

let statsCode = fs.readFileSync('src/views/Home/components/HomeStats.vue', 'utf8');
statsCode = statsCode.replace(/const ageSecs = Math\.floor\(\(Date\.now\(\) - tsMs\) \/ 1000\);/g, `const delayOffset = network === NET_ENV.TestT5 ? 2 : 10;
  const ageSecs = Math.max(0, Math.floor((Date.now() - tsMs) / 1000) - delayOffset);`);

fs.writeFileSync('src/views/Home/components/HomeStats.vue', statsCode);
