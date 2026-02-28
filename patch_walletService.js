const fs = require('fs');

let code = fs.readFileSync('src/services/walletService.js', 'utf8');

// 1. Add Web3Auth to providers
const targetProviders = `const PROVIDERS = {
  NEOLINE: "NeoLine",
  O3: "O3",
  WALLETCONNECT: "WalletConnect",
};`;

const newProviders = `const PROVIDERS = {
  NEOLINE: "NeoLine",
  O3: "O3",
  WALLETCONNECT: "WalletConnect",
  WEB3AUTH: "Google / Email (Web3Auth)",
};`;

code = code.replace(targetProviders, newProviders);

// 2. Add imports
const importsTarget = `import { walletConnectService } from "./walletConnectService";`;
const newImports = `import { walletConnectService } from "./walletConnectService";
import { web3authService } from "./web3authService";
import { rpc, tx, sc, u } from "@cityofzion/neon-js";
import { getCurrentEnv } from "@/utils/env";

const getRpcUrl = () => {
    const env = getCurrentEnv().toLowerCase();
    if (env.includes("test") || env.includes("t5")) {
        return "https://testnet1.neo.coz.io:443";
    }
    return "https://mainnet1.neo.coz.io:443";
};`;

code = code.replace(importsTarget, newImports);

// 3. Update getAvailableProviders
const getAvailTarget = `    if (isO3Available()) providers.push(PROVIDERS.O3);
    providers.push(PROVIDERS.WALLETCONNECT); // always available
    return providers;`;

const getAvailNew = `    if (isO3Available()) providers.push(PROVIDERS.O3);
    providers.push(PROVIDERS.WALLETCONNECT); // always available
    providers.push(PROVIDERS.WEB3AUTH); // always available via web
    return providers;`;
code = code.replace(getAvailTarget, getAvailNew);

// 4. Update connect
const connectTarget = `    if (providerName === PROVIDERS.WALLETCONNECT) {
      await walletConnectService.init(import.meta.env.VITE_WC_PROJECT_ID || "");
      const { uri, approval } = await walletConnectService.connect();
      // Return URI + approval promise so caller can show modal while waiting
      return {
        uri,
        approval: approval.then(() => {
          _connectedProvider = PROVIDERS.WALLETCONNECT;
          _account = walletConnectService.account;
          return _account;
        }),
      };
    }`;

const connectNew = connectTarget + `

    if (providerName === PROVIDERS.WEB3AUTH) {
      const account = await web3authService.connect();
      _connectedProvider = PROVIDERS.WEB3AUTH;
      _account = { address: account.address, label: "Web3Auth Account" };
      return _account;
    }`;

code = code.replace(connectTarget, connectNew);

// 5. Update disconnect
const disconnectTarget = `  disconnect() {
    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      walletConnectService.disconnect();
    }`;

const disconnectNew = `  disconnect() {
    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      walletConnectService.disconnect();
    }
    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      web3authService.disconnect();
    }`;
code = code.replace(disconnectTarget, disconnectNew);

// 6. Update signMessage
const signTarget = `    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      return await walletConnectService.signMessage(message);
    }`;

const signNew = signTarget + `

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const account = await web3authService.getAccount();
      // Emulate NeoLine's returned structure
      const messageHex = u.str2hexstring(message);
      const signature = account.sign(messageHex);
      return {
         publicKey: account.publicKey,
         data: signature,
         salt: "",
         message: message
      };
    }`;

code = code.replace(signTarget, signNew);

// 7. Update invoke
const invokeTarget = `    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      // WalletConnect doesn't support broadcastOverride natively in the same way via Neo dAPI wrapper out of the box,
      // but we pass it anyway.
      return walletConnectService.invoke({ scriptHash, operation, args: dapiArgs, signerScope: scope });
    }`;

const invokeNew = invokeTarget + `

    if (_connectedProvider === PROVIDERS.WEB3AUTH) {
      const account = await web3authService.getAccount();
      const rpcClient = new rpc.RPCClient(getRpcUrl());

      const sb = new sc.ScriptBuilder();
      const mappedArgs = args.map(a => sc.ContractParam.fromJson(a));
      sb.emitAppCall(scriptHash, operation, mappedArgs);
      const script = sb.build();

      const currentHeight = await rpcClient.getBlockCount();
      const invokeRes = await rpcClient.invokeScript(script, invokeSigners);

      if (invokeRes.state === "FAULT") {
          throw new Error("Web3Auth Simulation Faulted: " + invokeRes.exception);
      }

      let txn = new tx.Transaction({
          signers: invokeSigners,
          validUntilBlock: currentHeight + 1000,
          script: script,
          systemFee: invokeRes.gasconsumed || 1000000,
      });

      const magic = getCurrentEnv().toLowerCase().includes("test") ? 894710606 : 860833102;
      txn.sign(account, magic);
      
      const networkFee = await rpcClient.calculateNetworkFee(txn);
      
      // Resign with final explicit fees
      txn = new tx.Transaction({
          signers: invokeSigners,
          validUntilBlock: currentHeight + 1000,
          script: script,
          systemFee: invokeRes.gasconsumed || 1000000,
          networkFee: networkFee
      });
      txn.sign(account, magic);

      if (broadcastOverride) {
         return { signedTx: txn.serialize(true) };
      }

      const txid = await rpcClient.sendRawTransaction(txn.serialize(true));
      return { txid };
    }`;

code = code.replace(invokeTarget, invokeNew);

fs.writeFileSync('src/services/walletService.js', code);
