const fs = require('fs');

let file = fs.readFileSync('src/router/index.js', 'utf8');

const importReplacement = `const MultiSigTool = lazyLoad(() => import("../views/Tools/MultiSigTool.vue"));
const GovernanceTool = lazyLoad(() => import("../views/Tools/GovernanceTool.vue"));
const FormatConverterTool = lazyLoad(() => import("../views/Tools/FormatConverterTool.vue"));`;

file = file.replace(`const MultiSigTool = lazyLoad(() => import("../views/Tools/MultiSigTool.vue"));
const GovernanceTool = lazyLoad(() => import("../views/Tools/GovernanceTool.vue"));`, importReplacement);

const routesReplacement = `      {
        path: "/tools/governance",
        name: "governance-tool",
        meta: { title: "Council Governance" },
        component: GovernanceTool,
      },
      {
        path: "/tools/b64",
        name: "format-converter",
        meta: { title: "Format Converter" },
        component: FormatConverterTool,
      },`;

file = file.replace(/\{\s*path: "\/tools\/governance",\s*name: "governance-tool",\s*meta: \{ title: "Council Governance" \},\s*component: GovernanceTool,\s*\},/, routesReplacement);

fs.writeFileSync('src/router/index.js', file);
