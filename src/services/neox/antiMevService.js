import { toXTransaction } from "@/adapters/neox";
import { getNeoxAntiMevProfile } from "@/utils/neoxAntiMev";
import { getNeoxNet } from "@/utils/neoxEnv";
import { fetchBlockscout, LIST_TIMEOUT_MS } from "./blockscoutClient";
import { rpcService } from "./rpcService";

const GOV_REWARD_ADDRESS = "0x1212000000000000000000000000000000000003";
const STATUS_TTL_MS = 30_000;
const cache = new Map();
const inflight = new Map();

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();

async function fetchStatus(net, opts = {}) {
  const profile = getNeoxAntiMevProfile(net);
  const [headResult, feeResult, envelopesResult] = await Promise.allSettled([
    rpcService.getRpcBlockNumber({ net, signal: opts.signal }),
    rpcService.getEnvelopeFee({ net, signal: opts.signal }),
    fetchBlockscout(net, `addresses/${GOV_REWARD_ADDRESS}/transactions`, {
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    }),
  ]);

  const latestBlock = headResult.status === "fulfilled" ? headResult.value : null;
  const rawItems = envelopesResult.status === "fulfilled" && Array.isArray(envelopesResult.value?.items)
    ? envelopesResult.value.items
    : [];
  const recentEnvelopes = rawItems
    .map(toXTransaction)
    .filter((transaction) => transaction?.antiMev)
    .slice(0, 12);

  return {
    ...profile,
    latestBlock,
    active: Number.isFinite(latestBlock) ? latestBlock >= profile.activationHeight : null,
    envelopeFeeWei: feeResult.status === "fulfilled" ? feeResult.value : null,
    recentEnvelopes,
    latestDkgRound: recentEnvelopes.reduce((latest, transaction) => {
      const round = Number(transaction.antiMev?.dkgRound);
      return Number.isFinite(round) ? Math.max(latest, round) : latest;
    }, 0) || null,
    availability: {
      rpc: headResult.status === "fulfilled",
      policy: feeResult.status === "fulfilled",
      explorer: envelopesResult.status === "fulfilled",
    },
  };
}

export const antiMevService = {
  async getStatus(opts = {}) {
    const net = netOf(opts);
    const existing = cache.get(net);
    if (!opts.force && existing && Date.now() - existing.timestamp < STATUS_TTL_MS) return existing.value;
    if (!opts.force && inflight.has(net)) return inflight.get(net);

    const request = fetchStatus(net, opts)
      .then((value) => {
        cache.set(net, { timestamp: Date.now(), value });
        return value;
      })
      .finally(() => inflight.delete(net));
    inflight.set(net, request);
    return request;
  },

  clearCache(net) {
    if (net) cache.delete(net);
    else cache.clear();
  },
};

export default antiMevService;
