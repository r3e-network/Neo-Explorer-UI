const fs = require('fs');

let code = fs.readFileSync('src/router/index.js', 'utf8');

// Imports
const importsTarget = `const SponsoredTool = lazyLoad(() => import("../views/Tools/SponsoredTool.vue"));`;
const newImports = `const SponsoredTool = lazyLoad(() => import("../views/Tools/SponsoredTool.vue"));
const ContractDeployerTool = lazyLoad(() => import("../views/Tools/ContractDeployerTool.vue"));
const ContractFactoryTool = lazyLoad(() => import("../views/Tools/ContractFactoryTool.vue"));`;

code = code.replace(importsTarget, newImports);

// Routes
const routeTarget = `      {
        path: "/tools/sponsored",
        name: "sponsored-transactions",
        meta: { title: "Sponsored Transactions" },
        component: SponsoredTool,
      },`;
const newRoutes = routeTarget + `
      {
        path: "/tools/deployer",
        name: "contract-deployer",
        meta: { title: "Contract Deployer" },
        component: ContractDeployerTool,
      },
      {
        path: "/tools/factory",
        name: "contract-factory",
        meta: { title: "Contract Factory" },
        component: ContractFactoryTool,
      },`;

code = code.replace(routeTarget, newRoutes);
fs.writeFileSync('src/router/index.js', code);
