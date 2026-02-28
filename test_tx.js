const { tx, wallet, sc } = require('@cityofzion/neon-js');

const sponsorAccount = new wallet.Account();
const userAccount = new wallet.Account();

console.log("Sponsor script hash:", sponsorAccount.scriptHash);

const transaction = new tx.Transaction({
  signers: [
    { account: sponsorAccount.scriptHash, scopes: tx.WitnessScope.None },
    { account: userAccount.scriptHash, scopes: tx.WitnessScope.CalledByEntry }
  ],
  validUntilBlock: 1000,
  systemFee: 1000000,
  networkFee: 1000000,
  script: '01',
});

// Sponsor signs first
transaction.sign(sponsorAccount, 255); // 255 is network magic, test
console.log("Witnesses after sponsor sign:", transaction.witnesses.length);

const serialized = transaction.serialize(true); // true means with witnesses
console.log("Serialized:", serialized);

const deserialized = tx.Transaction.deserialize(serialized);
console.log("Witnesses after deserialize:", deserialized.witnesses.length);
