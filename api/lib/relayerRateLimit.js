const DEFAULT_POLICIES = Object.freeze({
    info: Object.freeze({ windowMs: 60_000, maxRequests: 60 }),
    prepare: Object.freeze({ windowMs: 60_000, maxRequests: 30 }),
    execute: Object.freeze({ windowMs: 60_000, maxRequests: 12 }),
    default: Object.freeze({ windowMs: 60_000, maxRequests: 20 }),
});

const SHARED_LIMITER_TIMEOUT_MS = 1_500;

const UPSTASH_FIXED_WINDOW_LUA = [
    'local key = KEYS[1]',
    'local max = tonumber(ARGV[1])',
    'local window = tonumber(ARGV[2])',
    'local current = redis.call("INCR", key)',
    'if current == 1 then redis.call("PEXPIRE", key, window) end',
    'local ttl = redis.call("PTTL", key)',
    'if ttl < 0 then redis.call("PEXPIRE", key, window); ttl = window end',
    'local allowed = 0',
    'if current <= max then allowed = 1 end',
    'return {allowed, current, ttl}'
].join('\n');

function sanitizeHex(hexStr) {
    if (!hexStr) return '';
    return String(hexStr).replace(/^0x/i, '').toLowerCase();
}

function isValidIpCandidate(value) {
    const ip = String(value || '').trim();
    if (!ip || ip.length > 64) return false;
    if (!/^[0-9a-fA-F:.]+$/.test(ip)) return false;
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) || /^[0-9a-fA-F:]+$/.test(ip);
}

function getClientIp(req, { trustProxy = false } = {}) {
    if (trustProxy) {
        const forwardedCandidates = [
            String(req?.headers?.['x-vercel-forwarded-for'] || '').split(',')[0].trim(),
            String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim(),
            String(req?.headers?.['cf-connecting-ip'] || '').trim(),
            String(req?.headers?.['x-real-ip'] || '').trim(),
        ];
        for (const candidate of forwardedCandidates) {
            if (isValidIpCandidate(candidate)) {
                return candidate.toLowerCase();
            }
        }
    }

    const remote = String(req?.socket?.remoteAddress || '').trim();
    if (isValidIpCandidate(remote)) {
        return remote.toLowerCase();
    }
    return 'unknown-ip';
}

function normalizeAction(action) {
    return String(action || 'execute').trim().toLowerCase();
}

function normalizeNetwork(network) {
    return String(network || 'unknown-network').trim().toLowerCase();
}

function normalizePositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}

function parsePolicyOverride(raw) {
    if (!raw) return null;
    const parts = String(raw).split(':');
    if (parts.length !== 2) return null;
    const maxRequests = normalizePositiveInt(parts[0], 0);
    const windowSeconds = normalizePositiveInt(parts[1], 0);
    if (maxRequests <= 0 || windowSeconds <= 0) return null;
    return { maxRequests, windowMs: windowSeconds * 1000 };
}

function resolveRateLimitPolicy(action, env = process.env) {
    const normalized = normalizeAction(action);
    const base = DEFAULT_POLICIES[normalized] || DEFAULT_POLICIES.default;

    const envKey = `RELAYER_RATE_LIMIT_${normalized.toUpperCase()}`;
    const override = parsePolicyOverride(env?.[envKey]) || parsePolicyOverride(env?.RELAYER_RATE_LIMIT_DEFAULT);
    if (!override) return base;

    return {
        maxRequests: override.maxRequests,
        windowMs: override.windowMs,
    };
}

function buildRateLimitKey({ ip, accountId, action, network }) {
    return buildRateLimitKeys({ ip, accountId, action, network })[1];
}

function buildRateLimitKeys({ ip, accountId, action, network }) {
    const account = sanitizeHex(accountId) || 'unknown-account';
    const safeIp = String(ip || 'unknown-ip').trim().toLowerCase();
    const safeAction = normalizeAction(action);
    const safeNetwork = normalizeNetwork(network);
    return [
        `relayer:${safeNetwork}:${safeAction}:iponly:${safeIp}`,
        `relayer:${safeNetwork}:${safeAction}:ipacct:${safeIp}:${account}`,
    ];
}

function createInMemoryRateLimiter({ cleanupEvery = 100 } = {}) {
    const store = new Map();
    let consumeCalls = 0;

    function cleanup(nowMs) {
        for (const [key, entry] of store.entries()) {
            if (!entry || nowMs >= entry.resetAtMs) {
                store.delete(key);
            }
        }
    }

    return {
        consume({ key, windowMs, maxRequests, nowMs = Date.now() }) {
            consumeCalls += 1;
            if (consumeCalls % cleanupEvery === 0) {
                cleanup(nowMs);
            }

            const policyWindowMs = normalizePositiveInt(windowMs, DEFAULT_POLICIES.default.windowMs);
            const policyMax = normalizePositiveInt(maxRequests, DEFAULT_POLICIES.default.maxRequests);
            const current = store.get(key);

            if (!current || nowMs >= current.resetAtMs) {
                const resetAtMs = nowMs + policyWindowMs;
                store.set(key, { count: 1, resetAtMs });
                return {
                    allowed: true,
                    limit: policyMax,
                    remaining: Math.max(0, policyMax - 1),
                    resetAtMs,
                    retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
                };
            }

            current.count += 1;
            store.set(key, current);

            const allowed = current.count <= policyMax;
            const remaining = Math.max(0, policyMax - current.count);
            const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAtMs - nowMs) / 1000));

            return {
                allowed,
                limit: policyMax,
                remaining,
                resetAtMs: current.resetAtMs,
                retryAfterSeconds,
            };
        },

        getTrackedKeyCount() {
            return store.size;
        },
    };
}

function getFirstNonEmpty(env, keys) {
    for (const key of keys) {
        const value = String(env?.[key] || '').trim();
        if (value) return value;
    }
    return '';
}

function resolveUpstashConfig(env = process.env) {
    const disabled = String(env?.RELAYER_RATE_LIMIT_DISABLE_SHARED || '').trim() === '1';
    if (disabled) return null;

    const urlRaw = getFirstNonEmpty(env, ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL']);
    const token = getFirstNonEmpty(env, ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']);
    if (!urlRaw || !token) return null;

    const url = urlRaw.replace(/\/+$/, '');
    return { url, token };
}

async function executeUpstashCommand({ url, token, command, fetchImpl, timeoutMs = SHARED_LIMITER_TIMEOUT_MS }) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetchImpl(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`Upstash HTTP ${res.status}`);
        }

        const json = await res.json();
        if (json && typeof json === 'object' && typeof json.error === 'string' && json.error) {
            throw new Error(json.error);
        }

        return json?.result;
    } finally {
        clearTimeout(timeoutHandle);
    }
}

function parseUpstashConsumeResult(rawResult, maxRequests, windowMs, nowMs) {
    if (!Array.isArray(rawResult) || rawResult.length < 3) {
        throw new Error('Invalid Upstash limiter response');
    }

    const allowed = Number(rawResult[0]) === 1;
    const count = Math.max(0, Number(rawResult[1]) || 0);
    const ttlMsRaw = Number(rawResult[2]);
    const ttlMs = Number.isFinite(ttlMsRaw) && ttlMsRaw > 0 ? ttlMsRaw : windowMs;

    return {
        allowed,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetAtMs: nowMs + ttlMs,
        retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    };
}

function createUpstashRateLimiter({
    url,
    token,
    fetchImpl = globalThis.fetch,
    timeoutMs = SHARED_LIMITER_TIMEOUT_MS,
    fallbackLimiter = createInMemoryRateLimiter(),
    fallbackOnError = true,
    logPrefix = '[RelayerRateLimit]',
} = {}) {
    if (!url || !token) {
        throw new Error('Upstash rate limiter requires url and token');
    }
    if (typeof fetchImpl !== 'function') {
        throw new Error('Upstash rate limiter requires fetch implementation');
    }

    let lastLogAt = 0;
    function logSharedFailure(error) {
        const now = Date.now();
        if (now - lastLogAt < 60_000) return;
        lastLogAt = now;
        if (fallbackOnError) {
            console.warn(`${logPrefix} shared limiter unavailable, falling back to in-memory limiter: ${error?.message || error}`);
        } else {
            console.warn(`${logPrefix} shared limiter unavailable and fallback is disabled: ${error?.message || error}`);
        }
    }

    return {
        async consume({ key, windowMs, maxRequests, nowMs = Date.now() }) {
            const policyWindowMs = normalizePositiveInt(windowMs, DEFAULT_POLICIES.default.windowMs);
            const policyMax = normalizePositiveInt(maxRequests, DEFAULT_POLICIES.default.maxRequests);

            try {
                const result = await executeUpstashCommand({
                    url,
                    token,
                    fetchImpl,
                    timeoutMs,
                    command: [
                        'EVAL',
                        UPSTASH_FIXED_WINDOW_LUA,
                        1,
                        key,
                        String(policyMax),
                        String(policyWindowMs),
                    ],
                });

                return parseUpstashConsumeResult(result, policyMax, policyWindowMs, nowMs);
            } catch (error) {
                logSharedFailure(error);
                if (!fallbackOnError) {
                    throw new Error(`shared limiter unavailable: ${error?.message || error}`);
                }
                return fallbackLimiter.consume({ key, windowMs: policyWindowMs, maxRequests: policyMax, nowMs });
            }
        },

        getTrackedKeyCount() {
            if (typeof fallbackLimiter.getTrackedKeyCount === 'function') {
                return fallbackLimiter.getTrackedKeyCount();
            }
            return 0;
        },

        isShared: true,
    };
}

function createDefaultRateLimiter({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
    const sharedConfig = resolveUpstashConfig(env);
    if (!sharedConfig) {
        return createInMemoryRateLimiter();
    }

    const failOpen = String(env?.RELAYER_RATE_LIMIT_FAIL_OPEN || '').trim() === '1';

    return createUpstashRateLimiter({
        ...sharedConfig,
        fetchImpl,
        fallbackLimiter: createInMemoryRateLimiter(),
        fallbackOnError: failOpen,
    });
}

const defaultLimiter = createDefaultRateLimiter();

async function enforceRelayerRateLimit({
    req,
    res,
    accountId,
    action,
    network,
    limiter = defaultLimiter,
    policy = null,
    trustProxy = String(process.env.RELAYER_TRUST_PROXY || '').trim() === '1',
    nowMs = Date.now(),
}) {
    const effectivePolicy = policy || resolveRateLimitPolicy(action);
    const keys = buildRateLimitKeys({
        ip: getClientIp(req, { trustProxy }),
        accountId,
        action,
        network,
    });

    const results = [];
    for (const key of keys) {
        let result;
        try {
            result = await Promise.resolve(limiter.consume({
                key,
                windowMs: effectivePolicy.windowMs,
                maxRequests: effectivePolicy.maxRequests,
                nowMs,
            }));
        } catch (error) {
            if (/shared limiter unavailable/i.test(String(error?.message || ''))) {
                res.status(503).json({
                    error: 'Rate limiting backend temporarily unavailable. Please retry shortly.',
                });
                return false;
            }
            throw error;
        }

        results.push(result);
        if (!result.allowed) {
            break;
        }
    }

    let result = results[0];
    for (let i = 1; i < results.length; i++) {
        const current = results[i];
        if (!result.allowed && current.allowed) continue;
        if (result.allowed && !current.allowed) {
            result = current;
            continue;
        }
        if (current.remaining < result.remaining) {
            result = current;
        }
    }

    const resetEpochSeconds = Math.max(1, Math.ceil(result.resetAtMs / 1000));
    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(resetEpochSeconds));

    if (result.allowed) {
        return true;
    }

    res.setHeader('Retry-After', String(result.retryAfterSeconds));
    res.status(429).json({
        error: `Rate limit exceeded. Retry in ${result.retryAfterSeconds}s.`,
    });
    return false;
}

export {
    buildRateLimitKey,
    buildRateLimitKeys,
    createDefaultRateLimiter,
    createInMemoryRateLimiter,
    createUpstashRateLimiter,
    enforceRelayerRateLimit,
    resolveRateLimitPolicy,
    resolveUpstashConfig,
};
