const fs = require('fs');

const code = fs.readFileSync('src/services/walletService.js', 'utf8');

const evmInvokeBlock = `
    if (_connectedProvider === PROVIDERS.EVM_WALLET) {
      if (!isEthereumAvailable()) throw new Error("EVM Wallet is not installed.");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Normalize args
      const normalizedArgs = normalizeInvokeArgsForRpc(args);
      const invalidArg = normalizedArgs.find((arg) => arg?.type === "Hash160" && !isHash160Hex(arg.value));
      if (invalidArg) throw new Error("Invalid Hash160 argument.");

      const aaHash = import.meta.env.VITE_AA_HASH_TESTNET || import.meta.env.VITE_AA_HASH || "0x1149a822c43df4a2a55ee9545bf108faf01bebdf";
      
      // Determine real nonce (Relayer could also provide this). Here we use timestamp as mock or fetch it.
      const nonce = Date.now();

      // We will use EIP-712 signing
      const domain = {
        name: 'Neo N3 Abstract Account',
        version: '1',
      };

      const types = {
        MetaTransaction: [
          { name: 'targetContract', type: 'string' },
          { name: 'method', type: 'string' },
          { name: 'argsJson', type: 'string' },
          { name: 'nonce', type: 'uint256' }
        ]
      };

      const value = {
        targetContract: String(scriptHash),
        method: String(operation),
        argsJson: JSON.stringify(normalizedArgs),
        nonce: nonce
      };

      const signature = await signer.signTypedData(domain, types, value);
      
      // Recover uncompressed public key from signature
      const digest = ethers.TypedDataEncoder.hash(domain, types, value);
      const uncompressedPubKey = ethers.SigningKey.recoverPublicKey(digest, signature);
      
      const payload = {
        uncompressedPubKey,
        targetContract: scriptHash,
        method: operation,
        args: normalizedArgs,
        nonce,
        signature
      };

      // Send to Relayer API
      const response = await fetch("/api/relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Relayer error");
      }

      const data = await response.json();
      return { txid: data.txid };
    }
`;

const res = code.replace(/if \(_connectedProvider === PROVIDERS.WEB3AUTH\) {/g, evmInvokeBlock + "\n    if (_connectedProvider === PROVIDERS.WEB3AUTH) {");
fs.writeFileSync('src/services/walletService.js', res);

// AppHeader.vue changes
let header = fs.readFileSync('src/components/layout/AppHeader.vue', 'utf8');
header = header.replace(
  /<a href="#" @click\.prevent="connect\('O3'\)" class="block px-4 py-2.*?>O3 Wallet<\/a>/g,
  `<a href="#" @click.prevent="connect('O3')" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">O3 Wallet</a>
               <a href="#" @click.prevent="connect('EVM Wallet (MetaMask, etc.)')" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500">
                 EVM Wallet (MetaMask)
               </a>`
);
fs.writeFileSync('src/components/layout/AppHeader.vue', header);

console.log("Patched wallet service and header.");
