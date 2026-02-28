const fs = require('fs');

let code = fs.readFileSync('src/router/index.js', 'utf8');

// Imports
const importsTarget = `const ContractFactoryTool = lazyLoad(() => import("../views/Tools/ContractFactoryTool.vue"));`;
const newImports = `const ContractFactoryTool = lazyLoad(() => import("../views/Tools/ContractFactoryTool.vue"));
const AbiEncoderTool = lazyLoad(() => import("../views/Tools/AbiEncoderTool.vue"));
const StorageInspectorTool = lazyLoad(() => import("../views/Tools/StorageInspectorTool.vue"));
const GasEstimatorTool = lazyLoad(() => import("../views/Tools/GasEstimatorTool.vue"));`;

code = code.replace(importsTarget, newImports);

// Routes
const routeTarget = `      {
        path: "/tools/factory",
        name: "contract-factory",
        meta: { title: "Contract Factory" },
        component: ContractFactoryTool,
      },`;
const newRoutes = routeTarget + `
      {
        path: "/tools/abi",
        name: "abi-encoder",
        meta: { title: "ABI Encoder" },
        component: AbiEncoderTool,
      },
      {
        path: "/tools/storage",
        name: "storage-inspector",
        meta: { title: "Storage Inspector" },
        component: StorageInspectorTool,
      },
      {
        path: "/tools/gas",
        name: "gas-estimator",
        meta: { title: "Gas Estimator" },
        component: GasEstimatorTool,
      },`;

code = code.replace(routeTarget, newRoutes);
fs.writeFileSync('src/router/index.js', code);
