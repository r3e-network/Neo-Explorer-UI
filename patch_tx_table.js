const fs = require('fs');

let code = fs.readFileSync('src/views/Transaction/components/TransactionTable.vue', 'utf8');

const targetStr = `function getRecipient(tx) {
  if (tx.script) {
     const inv = extractContractInvocation(tx.script);
     if (inv && inv.contractHash) return { hash: canonicalizeContractHash(inv.contractHash), type: 'contract' };
  }
  if (tx.notifications?.length > 0) {
    return { hash: canonicalizeContractHash(tx.notifications[0].contract), type: 'contract' };
  }
  const to = tx.contractHash || tx.to;
  if (to) {
    if (String(to).startsWith("N")) return { hash: to, type: "address" };
    return { hash: canonicalizeContractHash(to), type: "contract" };
  }
  return null;
}`;

const newStr = `function getRecipient(tx) {
  // Always prioritize the explicit tx.to or tx.contractHash fields if present in the model
  const to = tx.contractHash || tx.to || tx.recipient;
  if (to) {
    if (String(to).startsWith("N")) return { hash: to, type: "address" };
    return { hash: canonicalizeContractHash(to), type: "contract" };
  }
  
  if (tx.script) {
     const inv = extractContractInvocation(tx.script);
     if (inv && inv.contractHash) return { hash: canonicalizeContractHash(inv.contractHash), type: 'contract' };
  }
  if (tx.notifications?.length > 0) {
    return { hash: canonicalizeContractHash(tx.notifications[0].contract), type: 'contract' };
  }
  
  // Last resort, see if it has a transfers array and take the first one's TO
  if (tx.transfers && tx.transfers.length > 0 && tx.transfers[0].to) {
     const tTo = tx.transfers[0].to;
     if (String(tTo).startsWith("N")) return { hash: tTo, type: "address" };
     return { hash: canonicalizeContractHash(tTo), type: "contract" };
  }
  
  return null;
}`;

code = code.replace(targetStr, newStr);

// Let's also patch the TxListItem while we are here, it probably shares the logic
fs.writeFileSync('src/views/Transaction/components/TransactionTable.vue', code);
