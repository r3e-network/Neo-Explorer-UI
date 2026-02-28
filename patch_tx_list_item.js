const fs = require('fs');
let code = fs.readFileSync('src/components/common/TxListItem.vue', 'utf8');

const targetStr = `const recipient = computed(() => {
  const tx = props.tx;
  if (invocation.value?.contractHash) {
    const hash = canonicalizeContractHash(invocation.value.contractHash);
    return { hash, type: "contract" };
  }
  const to = tx.contractHash || tx.to;
  if (to) {
    // If it's a script hash, it's a contract. Otherwise, it's an address.
    const isAddress = String(to).startsWith("N");
    if (isAddress) {
      return { hash: to, type: "address" };
    } else {
      return { hash: canonicalizeContractHash(to), type: "contract" };
    }
  }
  if (tx.notifications?.length > 0) {
    return { hash: canonicalizeContractHash(tx.notifications[0].contract), type: 'contract' };
  }
  return null;
});`;

const newStr = `const recipient = computed(() => {
  const tx = props.tx;
  
  // Prioritize explicit to/contractHash properties
  const to = tx.contractHash || tx.to || tx.recipient;
  if (to) {
    const isAddress = String(to).startsWith("N");
    if (isAddress) {
      return { hash: to, type: "address" };
    } else {
      return { hash: canonicalizeContractHash(to), type: "contract" };
    }
  }
  
  if (invocation.value?.contractHash) {
    const hash = canonicalizeContractHash(invocation.value.contractHash);
    return { hash, type: "contract" };
  }
  if (tx.notifications?.length > 0) {
    return { hash: canonicalizeContractHash(tx.notifications[0].contract), type: 'contract' };
  }
  
  if (tx.transfers && tx.transfers.length > 0 && tx.transfers[0].to) {
     const tTo = tx.transfers[0].to;
     const isAddress = String(tTo).startsWith("N");
     return { hash: isAddress ? tTo : canonicalizeContractHash(tTo), type: isAddress ? "address" : "contract" };
  }
  
  return null;
});`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('src/components/common/TxListItem.vue', code);
