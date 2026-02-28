const fs = require('fs');
let code = fs.readFileSync('src/views/Charts/ChartsPage.vue', 'utf8');

code = code.replace(/_, i/g, '_, _i');
fs.writeFileSync('src/views/Charts/ChartsPage.vue', code);
