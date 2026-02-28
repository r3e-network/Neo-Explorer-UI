const fs = require('fs');

let file = fs.readFileSync('src/router/index.js', 'utf8');

const importReplacement = `const ToolsIndex = lazyLoad(() => import("../views/Tools/ToolsIndex.vue"));
const MultiSigTool = lazyLoad(() => import("../views/Tools/MultiSigTool.vue"));
const GovernanceTool = lazyLoad(() => import("../views/Tools/GovernanceTool.vue"));`;

file = file.replace(`const ToolsIndex = lazyLoad(() => import("../views/Tools/ToolsIndex.vue"));
const MultiSigTool = lazyLoad(() => import("../views/Tools/MultiSigTool.vue"));`, importReplacement);

const routesReplacement = `      {
        path: "/tools/multisig",
        name: "multisig",
        meta: { title: "Multi-Sig Tool" },
        component: MultiSigTool,
      },
      {
        path: "/tools/governance",
        name: "governance-tool",
        meta: { title: "Council Governance" },
        component: GovernanceTool,
      },`;

file = file.replace(/\{\s*path: "\/tools\/multisig",\s*name: "multisig",\s*meta: \{ title: "Multi-Sig Tool" \},\s*component: MultiSigTool,\s*\},/, routesReplacement);

fs.writeFileSync('src/router/index.js', file);
