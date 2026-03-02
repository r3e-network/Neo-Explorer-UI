const { tx, wallet, rpc, sc, u } = require('@cityofzion/neon-js');
const { ethers } = require('ethers');
const { enforceRelayerRateLimit } = require('./lib/relayerRateLimit');

module.exports.config = {
  runtime: 'nodejs',
};

const DEFAULT_DEADLINE_SECONDS = 5 * 60; // 5 minutes
const MAX_DEADLINE_WINDOW_SECONDS = 60 * 60; // 1 hour

// Helper to sanitize hex string inputs.
const sanitizeHex = (hexStr) => {
    if (!hexStr) return '';
    return String(hexStr).replace(/^0x/i, '').toLowerCase();
};

// Helper: Ensure valid hex length.
const isValidHex = (hexStr, expectedLen) => {
    const clean = sanitizeHex(hexStr);
    const regex = new RegExp(`^[0-9a-f]{${expectedLen}}$`);
    return regex.test(clean);
};

// Helper to convert hex strings or integers to Neo ContractParams.
function parseToContractParam(arg) {
    if (arg === null || arg === undefined) return sc.ContractParam.any(null);
    if (typeof arg === 'object' && arg.type && arg.value !== undefined) {
        if (arg.type === 'Hash160') return sc.ContractParam.hash160(sanitizeHex(arg.value));
        if (arg.type === 'Hash256') return sc.ContractParam.hash256(sanitizeHex(arg.value));
        if (arg.type === 'ByteArray') return sc.ContractParam.byteArray(u.HexString.fromHex(sanitizeHex(arg.value), false));
        if (arg.type === 'Integer') return sc.ContractParam.integer(arg.value);
        if (arg.type === 'String') return sc.ContractParam.string(arg.value);
        if (arg.type === 'Boolean') return sc.ContractParam.boolean(arg.value);
        if (arg.type === 'PublicKey') return sc.ContractParam.publicKey(sanitizeHex(arg.value));
        if (arg.type === 'Array') return sc.ContractParam.array(arg.value.map(parseToContractParam));
        if (arg.type === 'Any') return sc.ContractParam.any(arg.value);
    }
    return sc.ContractParam.any(arg);
}

function parseNonNegativeInteger(value, label) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isSafeInteger(parsed)) {
        throw new Error(`Invalid ${label}`);
    }
    return parsed;
}

function nowUnixSeconds() {
    return Math.floor(Date.now() / 1000);
}

function parseDeadlineSeconds(value) {
    const parsed = parseNonNegativeInteger(value, 'deadline');
    const now = nowUnixSeconds();
    if (parsed <= now) {
        throw new Error('Invalid deadline: must be in the future');
    }
    if (parsed > now + MAX_DEADLINE_WINDOW_SECONDS) {
        throw new Error(`Invalid deadline: exceeds ${MAX_DEADLINE_WINDOW_SECONDS}s window`);
    }
    return parsed;
}

function parseStackByteArrayHex(invokeRes) {
    const item = invokeRes?.stack?.[0];
    const value = String(item?.value || '');
    if (!value) throw new Error('Missing stack byte array value');

    const clean = sanitizeHex(value);
    if (/^[0-9a-f]+$/.test(clean) && clean.length % 2 === 0) {
        return clean;
    }

    try {
        return Buffer.from(value, 'base64').toString('hex').toLowerCase();
    } catch {
        throw new Error('Unable to decode stack byte array');
    }
}

function parseOptionalStackByteArrayHex(invokeRes) {
    const item = invokeRes?.stack?.[0];
    if (!item) return '';

    const value = item?.value;
    if (value === null || value === undefined || value === '') return '';
    if (item?.type === 'Any') return '';

    const valueString = String(value);
    const clean = sanitizeHex(valueString);
    if (/^[0-9a-f]+$/.test(clean) && clean.length % 2 === 0) {
        return clean;
    }

    try {
        return Buffer.from(valueString, 'base64').toString('hex').toLowerCase();
    } catch {
        throw new Error('Unable to decode optional stack byte array');
    }
}

function parseStackInteger(invokeRes) {
    const item = invokeRes?.stack?.[0];
    const value = item?.value;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        throw new Error('Invalid integer stack result');
    }
    return parsed;
}

function assertByteArrayHex(value, fieldName, { minBytes = 1, maxBytes = 64 } = {}) {
    const clean = sanitizeHex(value);
    if (!/^[0-9a-f]*$/.test(clean) || clean.length % 2 !== 0) {
        throw new Error(`Invalid ${fieldName} (requires even-length hex byte string)`);
    }
    const byteLength = clean.length / 2;
    if (byteLength < minBytes || byteLength > maxBytes) {
        throw new Error(`Invalid ${fieldName} length (${byteLength} bytes, allowed ${minBytes}-${maxBytes})`);
    }
    return clean;
}

function normalizeAccountAddress(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const clean = sanitizeHex(raw);
    if (isValidHex(clean, 40)) {
        return clean;
    }

    try {
        return sanitizeHex(wallet.getScriptHashFromAddress(raw));
    } catch {
        throw new Error('Invalid accountAddress (expected Neo N3 address or 160-bit hex)');
    }
}

function buildTypedDataEnvelope({ chainId, verifyingContract, accountId, targetContract, method, argsHash, nonce, deadline }) {
    const domain = {
        name: 'Neo N3 Abstract Account',
        version: '1',
        chainId,
        verifyingContract: `0x${sanitizeHex(verifyingContract)}`
    };

    const types = {
        MetaTransaction: [
            { name: 'accountId', type: 'bytes' },
            { name: 'targetContract', type: 'address' },
            { name: 'methodHash', type: 'bytes32' },
            { name: 'argsHash', type: 'bytes32' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
        ]
    };

    const message = {
        accountId: `0x${sanitizeHex(accountId)}`,
        targetContract: `0x${sanitizeHex(targetContract)}`,
        methodHash: ethers.keccak256(ethers.toUtf8Bytes(String(method))),
        argsHash: `0x${sanitizeHex(argsHash)}`,
        nonce: String(nonce),
        deadline: String(deadline)
    };

    return { domain, types, message };
}

async function computeArgsHash(rpcClient, aaHash, args) {
    const parsedArgs = Array.isArray(args) ? args : [];
    const script = sc.createScript({
        scriptHash: aaHash,
        operation: 'computeArgsHash',
        args: [sc.ContractParam.array(parsedArgs.map(parseToContractParam))]
    });

    const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (invokeRes.state === 'FAULT') {
        const exceptionMsg = String(invokeRes.exception || 'Unknown VM fault').split('\\n')[0];
        throw new Error(`computeArgsHash fault: ${exceptionMsg}`);
    }
    return parseStackByteArrayHex(invokeRes);
}

async function getNonceForAccount(rpcClient, aaHash, accountId, signerAddress) {
    const script = sc.createScript({
        scriptHash: aaHash,
        operation: 'getNonceForAccount',
        args: [
            sc.ContractParam.byteArray(u.HexString.fromHex(accountId, false)),
            sc.ContractParam.hash160(signerAddress)
        ]
    });

    const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (invokeRes.state === 'FAULT') {
        const exceptionMsg = String(invokeRes.exception || 'Unknown VM fault').split('\\n')[0];
        throw new Error(`getNonceForAccount fault: ${exceptionMsg}`);
    }
    return parseStackInteger(invokeRes);
}

async function getNonceForAddress(rpcClient, aaHash, accountAddress, signerAddress) {
    const script = sc.createScript({
        scriptHash: aaHash,
        operation: 'getNonceForAddress',
        args: [
            sc.ContractParam.hash160(accountAddress),
            sc.ContractParam.hash160(signerAddress)
        ]
    });

    const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (invokeRes.state === 'FAULT') {
        const exceptionMsg = String(invokeRes.exception || 'Unknown VM fault').split('\\n')[0];
        throw new Error(`getNonceForAddress fault: ${exceptionMsg}`);
    }
    return parseStackInteger(invokeRes);
}

async function getAccountIdByAddress(rpcClient, aaHash, accountAddress) {
    const script = sc.createScript({
        scriptHash: aaHash,
        operation: 'getAccountIdByAddress',
        args: [
            sc.ContractParam.hash160(accountAddress)
        ]
    });

    const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script), []);
    if (invokeRes.state === 'FAULT') {
        const exceptionMsg = String(invokeRes.exception || 'Unknown VM fault').split('\\n')[0];
        throw new Error(`getAccountIdByAddress fault: ${exceptionMsg}`);
    }
    return parseOptionalStackByteArrayHex(invokeRes);
}

function assertHash160(value, fieldName) {
    if (!isValidHex(value, 40)) {
        throw new Error(`Invalid ${fieldName} (requires 160-bit hex)`);
    }
}

function pickFirstValidHash(candidates) {
    for (const candidate of candidates) {
        const clean = sanitizeHex(candidate);
        if (isValidHex(clean, 40)) {
            return clean;
        }
    }
    return '';
}

function getConfiguredAaHash(isTestnet) {
    if (isTestnet) {
        return pickFirstValidHash([
            process.env.AA_HASH_TESTNET,
            process.env.ABSTRACT_ACCOUNT_HASH_TESTNET,
            process.env.VITE_AA_HASH_TESTNET,
            process.env.AA_HASH,
            process.env.ABSTRACT_ACCOUNT_HASH,
            process.env.VITE_AA_HASH
        ]);
    }

    return pickFirstValidHash([
        process.env.AA_HASH_MAINNET,
        process.env.ABSTRACT_ACCOUNT_HASH_MAINNET,
        process.env.VITE_AA_HASH_MAINNET,
        process.env.AA_HASH,
        process.env.ABSTRACT_ACCOUNT_HASH,
        process.env.VITE_AA_HASH
    ]);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const body = req.body || {};
    const {
        action,
        network,
        aaHash,
        accountId,
        accountAddress,
        signerAddress,
        targetContract,
        method,
        args,
        argsHash,
        nonce,
        deadline,
        signature
    } = body;

    try {
        const relayerWif = process.env.SPONSORED_WIF || process.env.RELAYER_WIF;
        if (!relayerWif) {
            console.error('[Relayer API] Missing WIF configuration in environment variables.');
            return res.status(500).json({ error: 'Relayer service is improperly configured.' });
        }
        const relayerAccount = new wallet.Account(relayerWif);

        const normalizedAction = String(action || 'execute').toLowerCase();
        if (!(await enforceRelayerRateLimit({
            req,
            res,
            accountId: sanitizeHex(accountAddress || accountId),
            action: normalizedAction,
            network,
        }))) {
            return;
        }

        if (normalizedAction === 'info') {
            return res.status(200).json({ relayerAddress: relayerAccount.address });
        }

        const isTestnet = String(network).toLowerCase().includes('test') || String(network).toLowerCase().includes('t5');
        const magic = isTestnet ? 894710606 : 860833102;
        const rpcUrl = isTestnet ? 'https://testnet1.neo.coz.io:443' : 'https://mainnet1.neo.coz.io:443';
        const rpcClient = new rpc.RPCClient(rpcUrl);

        const cleanAaHash = sanitizeHex(aaHash);
        let cleanAccountAddress;
        try {
            cleanAccountAddress = normalizeAccountAddress(accountAddress);
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Invalid accountAddress' });
        }
        if (!cleanAaHash) {
            return res.status(400).json({ error: 'Missing required meta-transaction parameters payload.' });
        }
        assertHash160(cleanAaHash, 'aaHash');

        let cleanAccountId = '';
        if (accountId !== undefined && accountId !== null && String(accountId).trim() !== '') {
            try {
                cleanAccountId = assertByteArrayHex(accountId, 'accountId', { minBytes: 1, maxBytes: 64 });
            } catch (e) {
                return res.status(400).json({ error: e.message || 'Invalid accountId' });
            }
        }

        let hasAddressBinding = false;
        if (cleanAccountAddress) {
            let resolvedAccountId = '';
            try {
                resolvedAccountId = await getAccountIdByAddress(rpcClient, cleanAaHash, cleanAccountAddress);
            } catch (e) {
                return res.status(400).json({ error: e.message || 'Unable to resolve accountId from accountAddress' });
            }

            if (resolvedAccountId) {
                try {
                    const normalizedResolvedId = assertByteArrayHex(resolvedAccountId, 'resolved accountId', { minBytes: 1, maxBytes: 64 });
                    if (cleanAccountId && cleanAccountId !== normalizedResolvedId) {
                        return res.status(400).json({ error: 'accountId does not match accountAddress binding.' });
                    }
                    cleanAccountId = normalizedResolvedId;
                    hasAddressBinding = true;
                } catch (e) {
                    return res.status(400).json({ error: e.message || 'Invalid resolved accountId' });
                }
            }
        }

        if (!cleanAccountId) {
            return res.status(400).json({ error: 'Missing account reference: provide accountAddress (bound) or accountId.' });
        }

        let cleanSignerAddress = sanitizeHex(signerAddress);
        if (!cleanSignerAddress && isValidHex(cleanAccountId, 40)) {
            cleanSignerAddress = cleanAccountId;
        }
        const cleanTargetContract = sanitizeHex(targetContract);
        const parsedMethod = String(method || '').trim();
        const parsedArgs = Array.isArray(args) ? args : [];

        if (!cleanAaHash || !cleanTargetContract || !parsedMethod || !cleanSignerAddress) {
            return res.status(400).json({ error: 'Missing required meta-transaction parameters payload.' });
        }

        assertHash160(cleanTargetContract, 'targetContract');
        assertHash160(cleanSignerAddress, 'signerAddress');
        if (cleanAccountAddress) {
            assertHash160(cleanAccountAddress, 'accountAddress');
        }

        const configuredAaHash = getConfiguredAaHash(isTestnet);
        if (!configuredAaHash) {
            return res.status(500).json({
                error: `Relayer contract hash not configured for ${isTestnet ? 'testnet' : 'mainnet'}.`
            });
        }
        if (cleanAaHash !== configuredAaHash) {
            return res.status(403).json({ error: 'aaHash is not allowed by relayer policy.' });
        }

        if (normalizedAction === 'prepare') {
            let preparedNonce;
            try {
                if (nonce == null) {
                    preparedNonce = hasAddressBinding
                        ? await getNonceForAddress(rpcClient, cleanAaHash, cleanAccountAddress, cleanSignerAddress)
                        : await getNonceForAccount(rpcClient, cleanAaHash, cleanAccountId, cleanSignerAddress);
                } else {
                    preparedNonce = parseNonNegativeInteger(nonce, 'nonce');
                }
            } catch (e) {
                return res.status(400).json({ error: e.message || 'Invalid nonce' });
            }

            let preparedDeadline;
            try {
                preparedDeadline = deadline == null
                    ? nowUnixSeconds() + DEFAULT_DEADLINE_SECONDS
                    : parseDeadlineSeconds(deadline);
            } catch (e) {
                return res.status(400).json({ error: e.message || 'Invalid deadline' });
            }

            let computedArgsHash;
            try {
                computedArgsHash = await computeArgsHash(rpcClient, cleanAaHash, parsedArgs);
            } catch (e) {
                return res.status(400).json({ error: e.message || 'Unable to prepare args hash' });
            }

            const envelope = buildTypedDataEnvelope({
                chainId: magic,
                verifyingContract: cleanAaHash,
                accountId: cleanAccountId,
                targetContract: cleanTargetContract,
                method: parsedMethod,
                argsHash: computedArgsHash,
                nonce: preparedNonce,
                deadline: preparedDeadline
            });

            return res.status(200).json({
                success: true,
                aaHash: `0x${cleanAaHash}`,
                accountAddress: cleanAccountAddress ? `0x${cleanAccountAddress}` : null,
                accountId: `0x${cleanAccountId}`,
                signerAddress: `0x${cleanSignerAddress}`,
                targetContract: `0x${cleanTargetContract}`,
                method: parsedMethod,
                argsHash: envelope.message.argsHash,
                nonce: envelope.message.nonce,
                deadline: envelope.message.deadline,
                domain: envelope.domain,
                types: envelope.types,
                message: envelope.message
            });
        }

        if (normalizedAction !== 'execute') {
            return res.status(400).json({ error: `Unsupported action: ${normalizedAction}` });
        }

        const cleanArgsHash = sanitizeHex(argsHash);
        if (!isValidHex(cleanArgsHash, 64)) {
            return res.status(400).json({ error: 'Invalid argsHash (requires 32-byte hex)' });
        }

        let parsedNonce;
        let parsedDeadline;
        try {
            parsedNonce = parseNonNegativeInteger(nonce, 'nonce');
            parsedDeadline = parseDeadlineSeconds(deadline);
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Invalid nonce/deadline' });
        }

        const cleanSignature = sanitizeHex(signature);
        if (!isValidHex(cleanSignature, 130)) {
            return res.status(400).json({ error: 'Invalid signature (expected 65-byte ECDSA signature with recovery id)' });
        }
        const signatureWithRecovery = `0x${cleanSignature}`;
        const signatureNoRecovery = cleanSignature.slice(0, 128);

        let computedArgsHash;
        try {
            computedArgsHash = await computeArgsHash(rpcClient, cleanAaHash, parsedArgs);
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Unable to verify args hash' });
        }
        if (computedArgsHash !== cleanArgsHash) {
            return res.status(400).json({ error: 'Args mismatch: provided argsHash does not match payload args.' });
        }

        const envelope = buildTypedDataEnvelope({
            chainId: magic,
            verifyingContract: cleanAaHash,
            accountId: cleanAccountId,
            targetContract: cleanTargetContract,
            method: parsedMethod,
            argsHash: cleanArgsHash,
            nonce: parsedNonce,
            deadline: parsedDeadline
        });

        let recoveredAddress;
        let recoveredPubKey;
        try {
            recoveredAddress = ethers.verifyTypedData(
                envelope.domain,
                envelope.types,
                envelope.message,
                signatureWithRecovery
            ).toLowerCase();
            const digest = ethers.TypedDataEncoder.hash(envelope.domain, envelope.types, envelope.message);
            recoveredPubKey = sanitizeHex(ethers.SigningKey.recoverPublicKey(digest, signatureWithRecovery));
        } catch (e) {
            return res.status(400).json({ error: `Signature verification failed: ${e.message}` });
        }

        if (recoveredAddress !== `0x${cleanSignerAddress}`) {
            return res.status(400).json({ error: 'Recovered signer does not match signerAddress.' });
        }
        if (!(recoveredPubKey.length === 130 || recoveredPubKey.length === 128)) {
            return res.status(400).json({ error: 'Recovered public key is invalid.' });
        }

        let script;
        try {
            if (hasAddressBinding) {
                script = sc.createScript({
                    scriptHash: cleanAaHash,
                    operation: 'executeMetaTxByAddress',
                    args: [
                        sc.ContractParam.hash160(cleanAccountAddress),
                        sc.ContractParam.byteArray(u.HexString.fromHex(recoveredPubKey, false)),
                        sc.ContractParam.hash160(cleanTargetContract),
                        sc.ContractParam.string(parsedMethod),
                        sc.ContractParam.array(parsedArgs.map(parseToContractParam)),
                        sc.ContractParam.byteArray(u.HexString.fromHex(cleanArgsHash, false)),
                        sc.ContractParam.integer(parsedNonce),
                        sc.ContractParam.integer(parsedDeadline),
                        sc.ContractParam.byteArray(u.HexString.fromHex(signatureNoRecovery, false))
                    ]
                });
            } else {
                script = sc.createScript({
                    scriptHash: cleanAaHash,
                    operation: 'executeMetaTx',
                    args: [
                        sc.ContractParam.byteArray(u.HexString.fromHex(cleanAccountId, false)),
                        sc.ContractParam.byteArray(u.HexString.fromHex(recoveredPubKey, false)),
                        sc.ContractParam.hash160(cleanTargetContract),
                        sc.ContractParam.string(parsedMethod),
                        sc.ContractParam.array(parsedArgs.map(parseToContractParam)),
                        sc.ContractParam.byteArray(u.HexString.fromHex(cleanArgsHash, false)),
                        sc.ContractParam.integer(parsedNonce),
                        sc.ContractParam.integer(parsedDeadline),
                        sc.ContractParam.byteArray(u.HexString.fromHex(signatureNoRecovery, false))
                    ]
                });
            }
        } catch (scErr) {
            return res.status(400).json({ error: `Script Builder Exception: ${scErr.message}` });
        }

        const currentHeight = await rpcClient.getBlockCount();
        const signers = [
            {
                account: relayerAccount.scriptHash,
                scopes: tx.WitnessScope.CustomContracts,
                allowedContracts: [`0x${cleanAaHash}`],
                allowedcontracts: [`0x${cleanAaHash}`]
            }
        ];

        const invokeRes = await rpcClient.invokeScript(u.HexString.fromHex(script), signers);
        if (invokeRes.state === 'FAULT') {
            const exceptionMsg = String(invokeRes.exception || 'Unknown VM fault').split('\\n')[0];
            return res.status(400).json({ error: `Simulation failed: ${exceptionMsg}` });
        }

        const systemFee = parseInt(invokeRes.gasconsumed || '1000000', 10);
        const MAX_SYSTEM_FEE = 200000000; // 2 GAS
        if (systemFee > MAX_SYSTEM_FEE) {
            return res.status(400).json({ error: `Transaction too expensive. Allowed: ${MAX_SYSTEM_FEE}, Required: ${systemFee}` });
        }

        let transaction = new tx.Transaction({
            signers,
            validUntilBlock: currentHeight + 1000,
            script,
            systemFee
        });

        transaction.sign(relayerAccount, magic);

        const networkFeeResponse = await rpcClient.calculateNetworkFee(transaction);
        const parsedNetworkFee = parseInt(networkFeeResponse ? networkFeeResponse.toString() : '5000000', 10);
        const MAX_NETWORK_FEE = 100000000; // 1 GAS
        if (parsedNetworkFee > MAX_NETWORK_FEE) {
            return res.status(400).json({ error: `Network fee exceeds limits. Allowed: ${MAX_NETWORK_FEE}, Required: ${parsedNetworkFee}` });
        }

        const safeNetworkFee = parsedNetworkFee + 10000;
        transaction = new tx.Transaction({
            signers,
            validUntilBlock: currentHeight + 1000,
            script,
            systemFee,
            networkFee: safeNetworkFee
        });
        transaction.sign(relayerAccount, magic);

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
