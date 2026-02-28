const fs = require('fs');

let code = fs.readFileSync('src/router/index.js', 'utf8');

const targetStr1 = `const BroadcastMessageTool = lazyLoad(() => import("../views/Tools/BroadcastMessageTool.vue"));`;
const newStr1 = `const BroadcastMessageTool = lazyLoad(() => import("../views/Tools/BroadcastMessageTool.vue"));\nconst SponsoredTool = lazyLoad(() => import("../views/Tools/SponsoredTool.vue"));`;

code = code.replace(targetStr1, newStr1);

const targetStr2 = `      {
        path: "/tools/broadcast",
        name: "broadcast-message",
        meta: { title: "On-Chain Message" },
        component: BroadcastMessageTool,
      },`;
const newStr2 = targetStr2 + `\n      {
        path: "/tools/sponsored",
        name: "sponsored-transactions",
        meta: { title: "Sponsored Transactions" },
        component: SponsoredTool,
      },`;

code = code.replace(targetStr2, newStr2);
fs.writeFileSync('src/router/index.js', code);
