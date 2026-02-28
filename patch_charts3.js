const fs = require('fs');

let code = fs.readFileSync('src/views/Charts/ChartsPage.vue', 'utf8');

const patch = `
    const fillMockData = (raw) => {
      const arr = Array.isArray(raw) ? raw : [];
      if (arr.length === 0) return Array.from({ length: selectedDays.value }, () => ({ value: 0 }));
      if (arr.length < selectedDays.value) {
         return [...Array.from({ length: selectedDays.value - arr.length }, () => ({ value: 0 })), ...arr];
      }
      return arr.slice(-selectedDays.value);
    };
`;

code = code.replace(/const fillMockData = \(raw\) => \{[\s\S]*?return arr\.slice\(-selectedDays\.value\);\n    \};/m, patch);

const target1 = `    addressGrowthData.value = fillMockData(rawGrowth, 'NewAddresses');
    contractData.value = fillMockData(rawContract);
    tokenVolumeData.value = fillMockData(rawTokenVol);
    gasPriceData.value = fillMockData(rawGasPrice);`;

const new1 = `    // Extract the mock object arrays into flat arrays
    addressGrowthData.value = fillMockData(rawGrowth);
    contractData.value = fillMockData(rawContract);
    tokenVolumeData.value = fillMockData(rawTokenVol);
    gasPriceData.value = fillMockData(rawGasPrice);`;

code = code.replace(target1, new1);

const target2 = `  const addrGrowthValues = addressGrowthData.value.map((d) => d.value ?? d.NewAddresses ?? 0);`;
const new2 = `  const addrGrowthValues = addressGrowthData.value.map((d) => Number(d.value ?? d.NewAddresses ?? d.count ?? d.total ?? 0));`;
code = code.replace(target2, new2);

const target3 = `  const contractValues = contractData.value.map((d) => d.value);
  const tokenVolValues = tokenVolumeData.value.map((d) => d.value);
  const gasPriceValues = gasPriceData.value.map((d) => d.value);`;
const new3 = `  const contractValues = contractData.value.map((d) => Number(d.value ?? d.count ?? d.total ?? 0));
  const tokenVolValues = tokenVolumeData.value.map((d) => Number(d.value ?? d.count ?? d.total ?? 0));
  const gasPriceValues = gasPriceData.value.map((d) => Number(d.value ?? d.price ?? d.total ?? 0));`;
code = code.replace(target3, new3);

fs.writeFileSync('src/views/Charts/ChartsPage.vue', code);
