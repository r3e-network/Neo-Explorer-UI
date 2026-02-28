const fs = require('fs');

let file = fs.readFileSync('src/router/index.js', 'utf8');

const importReplacement = `const GovernanceTool = lazyLoad(() => import("../views/Tools/GovernanceTool.vue"));
const FormatConverterTool = lazyLoad(() => import("../views/Tools/FormatConverterTool.vue"));
const NeoFSTool = lazyLoad(() => import("../views/Tools/NeoFSTool.vue"));`;

file = file.replace(`const GovernanceTool = lazyLoad(() => import("../views/Tools/GovernanceTool.vue"));
const FormatConverterTool = lazyLoad(() => import("../views/Tools/FormatConverterTool.vue"));`, importReplacement);

const routesReplacement = `      {
        path: "/tools/b64",
        name: "format-converter",
        meta: { title: "Format Converter" },
        component: FormatConverterTool,
      },
      {
        path: "/tools/neofs",
        name: "neofs-gateway",
        meta: { title: "NeoFS Gateway" },
        component: NeoFSTool,
      },`;

file = file.replace(/\{\s*path: "\/tools\/b64",\s*name: "format-converter",\s*meta: \{ title: "Format Converter" \},\s*component: FormatConverterTool,\s*\},/, routesReplacement);

fs.writeFileSync('src/router/index.js', file);
