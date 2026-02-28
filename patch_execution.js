const fs = require('fs');

let code = fs.readFileSync('src/services/executionService.js', 'utf8');

const oldFunc = `    isComplexTransaction(appLog) {
      if (!appLog) return false;

      const executions = appLog.executions ?? [];
      if (executions.length > 1) return true;

      for (const exec of executions) {
        if (exec.vmstate === "FAULT") return true;

        const notifications = exec.notifications ?? [];
        if (notifications.length === 0) continue;
        if (notifications.length > 1) return true;

        const singleName = (notifications[0].eventname ?? "").toLowerCase();
        if (singleName !== "transfer") return true;
      }

      return false;
    },`;

const newFunc = `    isComplexTransaction(appLog) {
      if (!appLog) return false;

      const executions = appLog.executions ?? [];
      if (executions.length > 1) return true;

      for (const exec of executions) {
        if (exec.vmstate === "FAULT") return true;

        const notifications = exec.notifications ?? [];
        if (notifications.length === 0) continue;
        
        // Count unique contracts involved in notifications
        const uniqueContracts = new Set();
        for (const n of notifications) {
          if (n && n.contract) {
            uniqueContracts.add(n.contract);
          }
        }
        
        if (uniqueContracts.size > 1) return true;
        
        // If it involves only 1 contract, but has many notifications, 
        // we might still consider it complex, but for now we only flag
        // if there are multiple contracts or non-standard transfers.
        // Let's check if there are non-transfer events
        for (const n of notifications) {
          const eventName = (n.eventname ?? "").toLowerCase();
          if (eventName !== "transfer" && eventName !== "mint" && eventName !== "burn") return true;
        }
      }

      return false;
    },`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/services/executionService.js', code);
