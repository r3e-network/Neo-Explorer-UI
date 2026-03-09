const { rpc, tx, wallet, sc, u } = require("@cityofzion/neon-js");

const deployerWif = process.env.DEPLOYER_WIF || "";
if (!deployerWif) {
  throw new Error("Missing DEPLOYER_WIF env var");
}

const account = new wallet.Account(deployerWif);
const rpcUrl = process.env.RPC_URL || "https://rpc.r3e.network";
const rpcClient = new rpc.RPCClient(rpcUrl);

const contractHash =
  process.env.MATRIX_CONTRACT_HASH ||
  "0x6d56a2b3c4396fa64d90046a15a9a286309ea3dd"; // Mainnet Matrix Domain Contract Hash

const domainsToRegister = [
  "jimmy.matrix",
  "erik.matrix",
  "erikzhang.matrix",
  "da.matrix",
  "dahongfei.matrix",
  "hongfei.matrix",
  "neo.matrix",
  "ngd.matrix",
  "r3e.matrix",
  "coz.matrix",
  "axlabs.matrix",
  "nspcc.matrix",
  "red4sec.matrix",
  "nnt.matrix",
  "neonewstoday.matrix",
  "neospcc.matrix",
  "flamingo.matrix",
  "ghostmarket.matrix",
  "forthewin.matrix",
  "neoburger.matrix",
  "ndapp.matrix",
  "onegate.matrix",
  "neoline.matrix",
  "o3.matrix",
  "nash.matrix",
  "switcheo.matrix",
  "polynetwork.matrix",
  "neocli.matrix",
  "neogo.matrix",
  "neofura.matrix",
  "grantshares.matrix",
  "frank.matrix",
  "steven.matrix",
  "john.matrix"
];

async function checkAndRegisterDomains() {
  console.log("Account Address:", account.address);
  console.log("RPC URL:", rpcUrl);
  console.log("Targeting Contract:", contractHash);

  for (let i = 0; i < domainsToRegister.length; i++) {
    const domainName = domainsToRegister[i];
    console.log(`\nProcessing [${i + 1}/${domainsToRegister.length}]: ${domainName}`);

    try {
      // 1. Check availability
      const isAvailableScript = sc.createScript({
        scriptHash: contractHash,
        operation: "isAvailable",
        args: [sc.ContractParam.string(domainName)]
      });

      const b64CheckScript = Buffer.from(isAvailableScript, "hex").toString("base64");
      const checkRes = await rpcClient.execute(new rpc.Query({
        method: "invokescript",
        params: [b64CheckScript, []]
      }));

      let available = false;
      if (checkRes && checkRes.state === "HALT" && checkRes.stack && checkRes.stack.length > 0) {
        available = checkRes.stack[0].value;
      }

      if (!available) {
        console.log(`   -> SKIP: ${domainName} is already registered.`);
        continue;
      }

      // 2. Build Registration Transaction
      const script = sc.createScript({
        scriptHash: contractHash,
        operation: "register",
        args: [
          sc.ContractParam.string(domainName),
          sc.ContractParam.hash160(account.address)
        ]
      });

      const currentHeight = await rpcClient.getBlockCount();

      const transaction = new tx.Transaction({
        signers: [
          {
            account: account.scriptHash,
            scopes: tx.WitnessScope.CalledByEntry
          }
        ],
        validUntilBlock: currentHeight + 1000,
        script: script,
        systemFee: 0,
        networkFee: 0,
      });

      // 3. Compute Fees
      const b64Script = Buffer.from(script, "hex").toString("base64");
      const feesRes = await rpcClient.execute(new rpc.Query({
         method: "invokescript",
         params: [
           b64Script, 
           [ { account: account.scriptHash, scopes: "CalledByEntry" } ]
         ]
      }));

      if (feesRes && feesRes.state === "FAULT") {
        console.error(`   -> FAIL: Simulation faulted:`, feesRes.exception);
        continue;
      }

      transaction.systemFee = u.BigInteger.fromNumber(feesRes.gasconsumed);
      transaction.networkFee = u.BigInteger.fromNumber(5000000); // 0.05 GAS

      // 4. Sign & Broadcast
      const versionRes = await rpcClient.execute(new rpc.Query({ method: "getversion" }));
      const magic = versionRes.protocol.network;
      transaction.sign(account, magic);

      const result = await rpcClient.sendRawTransaction(transaction);
      console.log(`   -> SUCCESS: Registration TxId: ${result}`);

      // Wait a few seconds between txs to avoid mempool/rpc issues
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (err) {
      console.error(`   -> ERROR processing ${domainName}:`, err.message);
    }
  }
}

checkAndRegisterDomains();
