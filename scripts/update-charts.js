const fs = require('fs');

const path = 'src/views/Charts/ChartsPage.vue';
let content = fs.readFileSync(path, 'utf8');

// Replace "Active Addresses" chart with Address Growth
content = content.replace(
  '<h2 class="text-high mb-1 text-base font-semibold">Active Addresses</h2>',
  '<h2 class="text-high mb-1 text-base font-semibold">Address Growth</h2>'
);
content = content.replace(
  'Unique addresses that sent or received transactions per day',
  'Daily new address growth over time'
);

// Add 3 new chart divs after volumeChart
const newChartDivs = `
      <!-- Contract Deployment Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">Contract Deployments</h2>
        <p class="text-low mb-4 text-xs">
          Daily new smart contract deployments
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load contract chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="contractChart"></canvas>
        </div>
      </div>

      <!-- Token Transfer Volume Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">Token Transfer Volume</h2>
        <p class="text-low mb-4 text-xs">
          Estimated daily token transfer volume
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load token volume chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="tokenVolumeChart"></canvas>
        </div>
      </div>

      <!-- GAS Price History Chart -->
      <div class="etherscan-card p-5 mt-6">
        <h2 class="text-high mb-1 text-base font-semibold">GAS Price History</h2>
        <p class="text-low mb-4 text-xs">
          Daily historical GAS price trend
        </p>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 4" :key="i" height="44px" />
        </div>
        <div v-else-if="error" class="py-2">
          <ErrorState title="Failed to load gas price chart" :message="error" @retry="loadData" />
        </div>
        <div v-else class="h-[360px]">
          <canvas ref="gasPriceChart"></canvas>
        </div>
      </div>
`;
content = content.replace('      <!-- Transaction Volume (Bar Chart) -->', '      <!-- Transaction Volume (Bar Chart) -->');
// find the end of Transaction Volume section and append newChartDivs
content = content.replace(
  '        <div v-else class="h-[360px]">\n          <canvas ref="volumeChart"></canvas>\n        </div>\n      </div>\n    </section>',
  '        <div v-else class="h-[360px]">\n          <canvas ref="volumeChart"></canvas>\n        </div>\n      </div>\n' + newChartDivs + '    </section>'
);

// Update Script setup
content = content.replace(
  'const txChart = ref(null);',
  'const txChart = ref(null);\nconst contractChart = ref(null);\nconst tokenVolumeChart = ref(null);\nconst gasPriceChart = ref(null);'
);

content = content.replace(
  'let txChartInstance = null;',
  'let txChartInstance = null;\nlet contractChartInstance = null;\nlet tokenVolumeChartInstance = null;\nlet gasPriceChartInstance = null;'
);

// Add ref for other charts data
content = content.replace(
  'const chartData = ref([]);',
  'const chartData = ref([]);\nconst addressGrowthData = ref([]);\nconst contractData = ref([]);\nconst tokenVolumeData = ref([]);\nconst gasPriceData = ref([]);'
);

// Add destroyCharts
content = content.replace(
  'function destroyCharts() {',
  `function destroyCharts() {
  if (contractChartInstance) { contractChartInstance.destroy(); contractChartInstance = null; }
  if (tokenVolumeChartInstance) { tokenVolumeChartInstance.destroy(); tokenVolumeChartInstance = null; }
  if (gasPriceChartInstance) { gasPriceChartInstance.destroy(); gasPriceChartInstance = null; }`
);

// Replace renderCharts
const oldRenderCharts = `async function renderCharts(dataOnly = false) {
  const txValues = chartData.value.map((d) => d.transactions);
  const addrValues = chartData.value.map((d) => d.addresses);

  if (dataOnly) {
    const updated =
      updateChartData(txChartInstance, txValues) &&
      updateChartData(addressChartInstance, addrValues) &&
      updateChartData(volumeChartInstance, txValues);
    if (updated) return;
  }

  destroyCharts();
  await nextTick();

  txChartInstance = createChart(txChart, {
    type: "line",
    label: "Daily Transactions",
    color: "#165DFF",
    bgColor: "rgba(22, 93, 255, 0.08)",
    tooltipLabel: "Transactions",
    data: txValues,
  });

  addressChartInstance = createChart(addressChart, {
    type: "line",
    label: "Active Addresses",
    color: "#00B42A",
    bgColor: "rgba(0, 180, 42, 0.08)",
    tooltipLabel: "Active Addresses",
    data: addrValues,
  });

  volumeChartInstance = createChart(volumeChart, {
    type: "bar",
    label: "Transaction Volume",
    color: "#FF7D00",
    bgColor: "rgba(255, 125, 0, 0.6)",
    tooltipLabel: "Volume",
    data: txValues,
  });
}`;

const newRenderCharts = `async function renderCharts() {
  const txValues = chartData.value.map((d) => d.transactions);
  const addrGrowthValues = addressGrowthData.value.map((d) => d.value ?? d.NewAddresses ?? 0);
  const contractValues = contractData.value.map((d) => d.value);
  const tokenVolValues = tokenVolumeData.value.map((d) => d.value);
  const gasPriceValues = gasPriceData.value.map((d) => d.value);

  destroyCharts();
  await nextTick();

  txChartInstance = createChart(txChart, {
    type: "line",
    label: "Daily Transactions",
    color: "#165DFF",
    bgColor: "rgba(22, 93, 255, 0.08)",
    tooltipLabel: "Transactions",
    data: txValues,
  });

  addressChartInstance = createChart(addressChart, {
    type: "line",
    label: "Address Growth",
    color: "#00B42A",
    bgColor: "rgba(0, 180, 42, 0.08)",
    tooltipLabel: "New Addresses",
    data: addrGrowthValues,
  });

  volumeChartInstance = createChart(volumeChart, {
    type: "bar",
    label: "Transaction Volume",
    color: "#FF7D00",
    bgColor: "rgba(255, 125, 0, 0.6)",
    tooltipLabel: "Volume",
    data: txValues,
  });

  contractChartInstance = createChart(contractChart, {
    type: "line",
    label: "Contract Deployments",
    color: "#722ED1",
    bgColor: "rgba(114, 46, 209, 0.08)",
    tooltipLabel: "Deployments",
    data: contractValues,
  });

  tokenVolumeChartInstance = createChart(tokenVolumeChart, {
    type: "line",
    label: "Token Transfer Volume",
    color: "#F5319D",
    bgColor: "rgba(245, 49, 157, 0.08)",
    tooltipLabel: "Volume",
    data: tokenVolValues,
  });

  gasPriceChartInstance = createChart(gasPriceChart, {
    type: "line",
    label: "GAS Price",
    color: "#F7BA1E",
    bgColor: "rgba(247, 186, 30, 0.08)",
    tooltipLabel: "GAS Price",
    data: gasPriceValues,
  });
}`;

content = content.replace(oldRenderCharts, newRenderCharts);

// Replace createChart data.labels mapping
content = content.replace(
  '      labels: chartData.value.map((d) => formatDateLabel(d.date)),',
  '      labels: data.map((_, i) => formatDateLabel(formatDayOffset(selectedDays.value - i - 1))),'
);


// Replace loadData
const oldLoadData = `async function loadData(dataOnly = false) {
  loading.value = true;
  error.value = null;
  try {
    const raw = await statsService.getNetworkActivity(selectedDays.value);
    chartData.value = normalizeChartData(raw, selectedDays.value);
    await renderCharts(dataOnly);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load chart data:", err);
    error.value = t("errors.loadChartData");
  } finally {
    loading.value = false;
  }
}`;

const newLoadData = `async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const [rawActivity, rawGrowth, rawContract, rawTokenVol, rawGasPrice] = await Promise.all([
      statsService.getNetworkActivity(selectedDays.value),
      statsService.getDailyAddressGrowth(selectedDays.value),
      statsService.getDailyContracts(selectedDays.value),
      statsService.getTokenTransferVolume(selectedDays.value),
      statsService.getGasPriceHistory(selectedDays.value)
    ]);
    
    chartData.value = normalizeChartData(rawActivity, selectedDays.value);
    
    // Fallback/normalize mock data lengths
    const fillMockData = (raw, key) => {
      const arr = Array.isArray(raw) ? raw : [];
      if (arr.length === 0) return Array.from({ length: selectedDays.value }, () => ({ value: 0 }));
      if (arr.length < selectedDays.value) {
         return [...Array.from({ length: selectedDays.value - arr.length }, () => ({ value: 0 })), ...arr];
      }
      return arr.slice(-selectedDays.value);
    };

    addressGrowthData.value = fillMockData(rawGrowth, 'NewAddresses');
    contractData.value = fillMockData(rawContract);
    tokenVolumeData.value = fillMockData(rawTokenVol);
    gasPriceData.value = fillMockData(rawGasPrice);

    await renderCharts();
  } catch (err) {
    if (import.meta.env.DEV) console.error("Failed to load chart data:", err);
    error.value = t("errors.loadChartData");
  } finally {
    loading.value = false;
  }
}`;

content = content.replace(oldLoadData, newLoadData);

// Remove dataOnly=true usages
content = content.replace('loadData(true);', 'loadData();');

fs.writeFileSync(path, content);
console.log('Updated ChartsPage.vue');
