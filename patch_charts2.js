const fs = require('fs');

let code = fs.readFileSync('src/views/Charts/ChartsPage.vue', 'utf8');

// I'm investigating what happens to fillMockData:

const patch = `
    const fillMockData = (raw) => {
      const arr = Array.isArray(raw) ? raw : [];
      if (arr.length === 0) return Array.from({ length: selectedDays.value }, (_, i) => ({ value: 0 }));
      if (arr.length < selectedDays.value) {
         return [...Array.from({ length: selectedDays.value - arr.length }, (_, i) => ({ value: 0 })), ...arr];
      }
      return arr.slice(-selectedDays.value);
    };
`;

code = code.replace(/const fillMockData = \(raw\) => \{[\s\S]*?return arr\.slice\(-selectedDays\.value\);\n    \};/m, patch);
fs.writeFileSync('src/views/Charts/ChartsPage.vue', code);
