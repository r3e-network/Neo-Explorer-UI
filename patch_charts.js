const fs = require('fs');
let code = fs.readFileSync('src/views/Charts/ChartsPage.vue', 'utf8');

const targetStr = `      labels: data.map((_, i) => formatDateLabel(formatDayOffset(selectedDays.value - i - 1))),`;
const newStr = `      labels: chartData.value.map((_, i) => formatDateLabel(formatDayOffset(selectedDays.value - i - 1))),`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, newStr);
    fs.writeFileSync('src/views/Charts/ChartsPage.vue', code);
    console.log("Chart labels patched");
} else {
    console.log("Could not find string to replace");
}
