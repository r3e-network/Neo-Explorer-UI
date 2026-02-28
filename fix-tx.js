const fs = require('fs');
let code = fs.readFileSync('src/services/transactionService.js', 'utf8');

code = code.replace(/getByAddress: \{/g, '_getByAddress: {');
code = code.replace(/rpcMethod: "GetTransactionList",/g, 'rpcMethod: "GetTransactionList",\n      realtime: true,');

const extensionStr = `
    async getList(limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = true, ...requestOptions } = options;
      const res = await this._getList(limit, skip, requestOptions);
      if (!res || !res.result) return res;

      const enriched = await Promise.all(
        res.result.map(async (tx) => {
          if (enrichMissingFields && tx.vmstate === undefined && tx.hash) {
            try {
              const full = await this.getByHash(tx.hash, requestOptions);
              if (full && full.vmstate) tx.vmstate = full.vmstate;
            } catch (e) {}
          }
          return tx;
        })
      );
      return { ...res, result: enriched };
    },

    async getByAddress(address, limit = 20, skip = 0, options = {}) {
      const { enrichMissingFields = true, ...requestOptions } = options;
      const res = await this._getByAddress(address, limit, skip, requestOptions);
      if (!res || !res.result) return res;

      const enriched = await Promise.all(
        res.result.map(async (tx) => {
          if (enrichMissingFields && tx.vmstate === undefined && tx.hash) {
            try {
              const full = await this.getByHash(tx.hash, requestOptions);
              if (full && full.vmstate) tx.vmstate = full.vmstate;
            } catch (e) {}
          }
          return tx;
        })
      );
      return { ...res, result: enriched };
    }
  }
`;

code = code.replace(/    async getApplicationLog\(txHash\) \{\n      return executionService\.getExecutionTrace\(txHash\);\n    \},\n  \}/, `    async getApplicationLog(txHash) {
      return executionService.getExecutionTrace(txHash);
    },
${extensionStr}`);

fs.writeFileSync('src/services/transactionService.js', code);
