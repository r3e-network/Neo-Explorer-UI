function generateMockChartData(type, days) {
  const data = [];
  const now = Date.now();
  let baseValue = 0;
  let volatility = 0.1;
  let trend = 0;

  switch (type) {
    case 'address': baseValue = 120; volatility = 0.3; trend = 1.05; break;
    case 'contract': baseValue = 3; volatility = 0.8; trend = 1.01; break;
    case 'tokenVolume': baseValue = 50000; volatility = 0.4; trend = 1.02; break;
    case 'gasPrice': baseValue = 0.0012; volatility = 0.05; trend = 0.99; break;
  }

  let currentValue = baseValue;

  for (let i = 0; i < days; i++) {
    // Generate from oldest to newest
    const dDate = new Date(now - (days - 1 - i) * 86400000);
    const dateStr = dDate.toISOString().split('T')[0];

    currentValue = currentValue * trend + (Math.random() - 0.5) * currentValue * volatility;
    if (type === 'contract') currentValue = Math.max(0, Math.round(currentValue));
    if (type === 'address') currentValue = Math.max(10, Math.round(currentValue));
    if (type === 'tokenVolume') currentValue = Math.max(1000, Math.round(currentValue));

    data.push({ date: dateStr, value: currentValue });
  }

  return data;
}

const rawGrowth = generateMockChartData('address', 14);

const selectedDays = { value: 14 };

const fillMockData = (raw) => {
    const arr = Array.isArray(raw) ? raw : [];
    if (arr.length === 0) return Array.from({ length: selectedDays.value }, (_, i) => ({ value: 0 }));
    if (arr.length < selectedDays.value) {
        return [...Array.from({ length: selectedDays.value - arr.length }, (_, i) => ({ value: 0 })), ...arr];
    }
    return arr.slice(-selectedDays.value);
};

const addressGrowthData = fillMockData(rawGrowth, 'NewAddresses');

const addrGrowthValues = addressGrowthData.map((d) => d.value ?? d.NewAddresses ?? 0);

console.log(addrGrowthValues);
