const fs = require('fs');

let file = fs.readFileSync('src/router/index.js', 'utf8');

const importReplacement = `const NNS = () => import("@/views/NNS/NNS.vue");
const ToolsIndex = () => import("@/views/Tools/ToolsIndex.vue");
const MultiSigTool = () => import("@/views/Tools/MultiSigTool.vue");`;

file = file.replace('const NNS = () => import("@/views/NNS/NNS.vue");', importReplacement);

const routesReplacement = `      {
        path: "/nns",
        name: "nns",
        meta: { title: "NNS" },
        component: NNS,
      },
      {
        path: "/tools",
        name: "tools",
        meta: { title: "Tools" },
        component: ToolsIndex,
      },
      {
        path: "/tools/multisig",
        name: "multisig",
        meta: { title: "Multi-Sig Tool" },
        component: MultiSigTool,
      },`;

file = file.replace(/\{\s*path: "\/nns",\s*name: "nns",\s*meta: \{ title: "NNS" \},\s*component: NNS,\s*\},/, routesReplacement);

fs.writeFileSync('src/router/index.js', file);
