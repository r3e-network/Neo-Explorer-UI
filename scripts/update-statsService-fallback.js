const fs = require('fs');

const path = 'src/services/statsService.js';
let content = fs.readFileSync(path, 'utf8');

const oldDailyContracts = `    /**
     * Get Contract Deployment Chart Data
     */
    async getDailyContracts(days = 30) {
      return generateMockChartData('contract', days);
    },`;

const newDailyContracts = `    /**
     * Get Contract Deployment Chart Data
     */
    async getDailyContracts(days = 30) {
      try {
        const res = await rpc("GetDailyContracts", { Days: days });
        if (!res || !Array.isArray(res) || res.length === 0) throw new Error("Empty response");
        return res;
      } catch (e) {
        return generateMockChartData('contract', days);
      }
    },`;

const oldTokenVolume = `    /**
     * Get Token Transfer Volume Chart Data
     */
    async getTokenTransferVolume(days = 30) {
      return generateMockChartData('tokenVolume', days);
    },`;

const newTokenVolume = `    /**
     * Get Token Transfer Volume Chart Data
     */
    async getTokenTransferVolume(days = 30) {
      try {
        const res = await rpc("GetTokenTransferVolume", { Days: days });
        if (!res || !Array.isArray(res) || res.length === 0) throw new Error("Empty response");
        return res;
      } catch (e) {
        return generateMockChartData('tokenVolume', days);
      }
    },`;

content = content.replace(oldDailyContracts, newDailyContracts);
content = content.replace(oldTokenVolume, newTokenVolume);

fs.writeFileSync(path, content);
console.log('Updated statsService.js with fallbacks');
