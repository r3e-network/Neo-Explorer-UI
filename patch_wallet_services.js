const fs = require('fs');

let wcCode = fs.readFileSync('src/services/walletConnectService.js', 'utf8');
if (!wcCode.includes('async signMessage(')) {
    wcCode = wcCode.replace(
        'async invoke({ scriptHash, operation, args = [], signerScope = 1 }) {',
        `async signMessage(message) {
    if (!_session || !_client) throw new Error("WalletConnect not connected");
    return await _client.request({
      topic: _session.topic,
      chainId: NEO_N3_CHAIN,
      request: {
        method: "signMessage",
        params: { message }
      }
    });
  },

  /**
   * Invoke a contract method via the connected wallet.
   */
  async invoke({ scriptHash, operation, args = [], signerScope = 1 }) {`
    );
    fs.writeFileSync('src/services/walletConnectService.js', wcCode);
}

let wsCode = fs.readFileSync('src/services/walletService.js', 'utf8');
if (!wsCode.includes('async signMessage(')) {
    wsCode = wsCode.replace(
        'async invoke({ scriptHash, operation, args = [], scope = 1, signers = null, broadcastOverride = false }) {',
        `async signMessage(message) {
    if (!_account) throw new Error("Wallet not connected");

    if (_connectedProvider === PROVIDERS.NEOLINE) {
      const n3 = await getNeoLineN3();
      return await n3.signMessage({ message });
    }

    if (_connectedProvider === PROVIDERS.O3) {
      const dapi = window.neo3Dapi;
      return await dapi.signMessage({ message });
    }

    if (_connectedProvider === PROVIDERS.WALLETCONNECT) {
      return await walletConnectService.signMessage(message);
    }

    throw new Error("No wallet connected");
  },

async invoke({ scriptHash, operation, args = [], scope = 1, signers = null, broadcastOverride = false }) {`
    );
    fs.writeFileSync('src/services/walletService.js', wsCode);
}
