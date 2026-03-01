const { tx, wallet, rpc, sc, u } = require('@cityofzion/neon-js');

// Helper to sanitize hex string inputs
const sanitizeHex = (hexStr) => {
    if (!hexStr) return '';
    return String(hexStr).replace(/^0x/i, '');
};

// Helper: Ensure valid hex length (e.g. 40 chars for Hash160, 64 chars for uncompressed pubkey without 0x04)
const isValidHex = (hexStr, expectedLen) => {
    const clean = sanitizeHex(hexStr);
    const regex = new RegExp(`^[0-9a-fA-F]{${expectedLen}}$`);
    return regex.test(clean);
};

// Helper to convert hex strings or integers to Neo ContractParams
function parseToContractParam(arg) {
    if (arg === null || arg === undefined) return sc.ContractParam.any(null);
    if (typeof arg === 'object' && arg.type && arg.value !== undefined) {
        if (arg.type === 'Hash160') return sc.ContractParam.hash160(sanitizeHex(arg.value));
        if (arg.type === 'Hash256') return sc.ContractParam.hash256(sanitizeHex(arg.value));
        if (arg.type === 'ByteArray') return sc.ContractParam.byteArray(sanitizeHex(arg.value));
        if (arg.type === 'Integer') return sc.ContractParam.integer(arg.value);
        if (arg.type === 'String') return sc.ContractParam.string(arg.value);
        if (arg.type === 'Boolean') return sc.ContractParam.boolean(arg.value);
        if (arg.type === 'PublicKey') return sc.ContractParam.publicKey(sanitizeHex(arg.value));
        if (arg.type === 'Array') return sc.ContractParam.array(arg.value.map(parseToContractParam));
        if (arg.type === 'Any') return sc.ContractParam.any(arg.value);
    }
    return sc.ContractParam.any(arg);
}

export default async function handler(req, res) {
    // Restrict allowed HTTP methods
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    try {
        // [PRODUCTION SECURITY TODO]: Implement rate limiting (e.g., Vercel KV, Redis, Upstash) based on IP or User AccountId
        // to prevent users from spamming the network and draining the Relayer account.
        const {
            action,
            network,
            aaHash,
            accountId,
            uncompressedPubKey,
            targetContract,
            method,
            args,
            nonce,
            signature
        } = req.body;

        // Relayer uses the same wallet as Sponsor to pay for Network/System Fees
        const relayerWif = process.env.SPONSORED_WIF || process.env.RELAYER_WIF;
        if (!relayerWif) {
            console.error('[Relayer API] Missing WIF configuration in environment variables.');
            return res.status(500).json({ error: 'Relayer service is improperly configured.' });
        }

        const relayerAccount = new wallet.Account(relayerWif);

        // Ping / Discovery endpoint
        if (action === 'info') {
            return res.status(200).json({ relayerAddress: relayerAccount.address });
        }

        // Validate required EIP-712 parameters
        if (!aaHash || !uncompressedPubKey || !targetContract || !method || !signature) {
            return res.status(400).json({ error: 'Missing required EIP-712 parameters payload.' });
        }

        const isTestnet = String(network).toLowerCase().includes('test') || String(network).toLowerCase().includes('t5');
        const magic = isTestnet ? 894710606 : 860833102;
        const rpcUrl = isTestnet ? 'https://testnet1.neo.coz.io:443' : 'https://mainnet1.neo.coz.io:443';

        // Sanitize identifiers
        const cleanAaHash = sanitizeHex(aaHash);
        const cleanAccountId = sanitizeHex(accountId) || '00'.repeat(20);
        const cleanTargetContract = sanitizeHex(targetContract);
        const cleanSignature = sanitizeHex(signature);
        const cleanPubKey = sanitizeHex(uncompressedPubKey);
        const parsedMethod = String(method).trim();
        const parsedNonce = parseInt(nonce || 0, 10);

        // Strict validation
        if (!isValidHex(cleanAaHash, 40)) return res.status(400).json({ error: 'Invalid aaHash (requires 160-bit hex)' });
        if (!isValidHex(cleanTargetContract, 40)) return res.status(400).json({ error: 'Invalid targetContract (requires 160-bit hex)' });
        // uncompressed pub key could be 64 bytes (128 hex chars) or 65 bytes (130 hex chars with 0x04)
        if (cleanPubKey.length !== 128 && cleanPubKey.length !== 130) {
            return res.status(400).json({ error: 'Invalid uncompressedPubKey format' });
        }

        // Build the script for invoking ExecuteMetaTx
        let script;
        try {
            script = sc.createScript({
                scriptHash: cleanAaHash,
                operation: 'executeMetaTx',
                args: [
                    sc.ContractParam.hash160(cleanAccountId),
                    sc.ContractParam.byteArray(cleanPubKey),
                    sc.ContractParam.hash160(cleanTargetContract),
                    sc.ContractParam.string(parsedMethod),
                    sc.ContractParam.array((Array.isArray(args) ? args : []).map(parseToContractParam)),
                    sc.ContractParam.integer(parsedNonce),
                    sc.ContractParam.byteArray(cleanSignature)
                ]
            });
        } catch (scErr) {
            return res.status(400).json({ error: `Script Builder Exception: ${scErr.message}` });
        }

        const rpcClient = new rpc.RPCClient(rpcUrl);
        const currentHeight = await rpcClient.getBlockCount();

        const signers = [
            {
                account: relayerAccount.scriptHash,
                scopes: tx.WitnessScope.CalledByEntry
            }
        ];

        // Simulate execution using HexString to obtain precise gas consumed
        const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);

        if (invokeRes.state === 'FAULT') {
            const exceptionMsg = String(invokeRes.exception || 'Unknown VM fault').split('\\n')[0];
            return res.status(400).json({ error: `Simulation failed: ${exceptionMsg}` });
        }

        // Parse systemFee safely
        const systemFee = parseInt(invokeRes.gasconsumed || '1000000', 10);

        // Security check: Prevent malicious users from draining relayer GAS by executing heavy or infinite-looping contracts
        const MAX_SYSTEM_FEE = 200000000; // 2 GAS limit
        if (systemFee > MAX_SYSTEM_FEE) {
            return res.status(400).json({ error: `Transaction too expensive. Allowed: ${MAX_SYSTEM_FEE}, Required: ${systemFee}` });
        }

        // Initialize transaction structure
        let transaction = new tx.Transaction({
            signers,
            validUntilBlock: currentHeight + 1000,
            script,
            systemFee
        });

        // Sign temporarily to obtain exact payload size for network fee approximation
        transaction.sign(relayerAccount, magic);

        // Calculate accurate network fee locally via RPC payload size standards
        const networkFeeResponse = await rpcClient.calculateNetworkFee(transaction);
        const parsedNetworkFee = parseInt(networkFeeResponse ? networkFeeResponse.toString() : '5000000', 10);

        // Security check: Prevent network fee abuse
        const MAX_NETWORK_FEE = 100000000; // 1 GAS limit
        if (parsedNetworkFee > MAX_NETWORK_FEE) {
            return res.status(400).json({ error: `Network fee exceeds limits. Allowed: ${MAX_NETWORK_FEE}, Required: ${parsedNetworkFee}` });
        }

        // Re-build with accurate network fee (adding a tiny buffer 0.0001 to prevent node bounds rejection)
        const safeNetworkFee = parsedNetworkFee + 10000;

        transaction = new tx.Transaction({
            signers,
            validUntilBlock: currentHeight + 1000,
            script,
            systemFee,
            networkFee: safeNetworkFee
        });

        // Apply cryptographic signature to the exact transaction bytes
        transaction.sign(relayerAccount, magic);

        // Serialize and broadcast
        const fullySignedHex = transaction.serialize(true);

        try {
            const txid = await rpcClient.sendRawTransaction(fullySignedHex);
            return res.status(200).json({
                success: true,
                txid,
                systemFee,
                networkFee: safeNetworkFee,
                message: 'Transaction sponsored and broadcasted successfully.'
            });
        } catch (err) {
            console.error('[Relayer API] Broadcast error:', err.message);
            return res.status(400).json({ error: `Broadcast failed: ${err.message}` });
        }

    } catch (e) {
        console.error('[Relayer API] Internal Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
