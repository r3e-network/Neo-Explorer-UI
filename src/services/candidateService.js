import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { safeRpc } from "./api";
import { mapRpcCandidatesToCandidateRows } from "./legacyFallbacks";
import { addressToScriptHash, publicKeyToAddress } from "@/utils/neoHelpers";

/**
 * Candidate Service - Neo3 候选人/验证人相关 API
 * @module services/candidateService
 * @description 通过 neo3fura 获取共识节点候选人数据
 */

// Normalize any candidate identifier (base58 address, 0x-script-hash, bare
// hex, or public key) to a lowercase, 0x-stripped form for comparison.
function normalizeCandidateId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^0x/, "");
}

// Find the candidate row (from mapped `getcandidates` output) matching an
// address supplied as base58, script hash, or public key.
function matchCandidateRow(rows, address) {
  const target = normalizeCandidateId(address);
  const targetScriptHash = normalizeCandidateId(addressToScriptHash(address) || "");
  if (!target && !targetScriptHash) return null;

  return (
    (Array.isArray(rows) ? rows : []).find((row) => {
      const candScriptHash = normalizeCandidateId(row?.candidate);
      const candPubKey = normalizeCandidateId(row?.publickey);
      const candAddress = normalizeCandidateId(publicKeyToAddress(row?.publickey || ""));
      return (
        (candScriptHash && (candScriptHash === target || candScriptHash === targetScriptHash)) ||
        (candPubKey && candPubKey === target) ||
        (candAddress && candAddress === target)
      );
    }) || null
  );
}

export const candidateService = createService(
  {
    _getCountRpc: {
      cacheKey: "candidate_count",
      rpcMethod: "GetCandidateCount",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: () => ({}),
    },
    _getListRpc: {
      _type: "list",
      cacheKey: "candidate_list",
      rpcMethod: "GetCandidate",
      errorLabel: "get candidate list",
      ttl: CACHE_TTL.chart,
      buildParams: ([limit = 20, skip = 0]) => ({ Limit: limit, Skip: skip }),
      buildCacheParams: ([limit = 20, skip = 0]) => ({ limit, skip }),
    },
    // Legacy Mongo wrappers — kept only as last-resort fallbacks behind the
    // node `getcandidates` derivation below (the Mongo collections they query
    // are no longer populated, so they return empty in production).
    _getByAddressRpc: {
      cacheKey: "candidate_address",
      rpcMethod: "GetCandidateByAddress",
      fallback: null,
      ttl: CACHE_TTL.address,
      realtime: true,
      buildParams: ([address]) => ({ Address: address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    _getVotesByAddressRpc: {
      cacheKey: "candidate_votes",
      rpcMethod: "GetVotesByCandidateAddress",
      fallback: 0,
      ttl: CACHE_TTL.stats,
      realtime: true,
      buildParams: ([address]) => ({ CandidateAddress: address }),
      buildCacheParams: ([address]) => ({ address }),
    },
    getVotersByAddress: {
      _type: "list",
      cacheKey: "candidate_voters",
      rpcMethod: "GetVotersByCandidateAddress",
      errorLabel: "get voters",
      ttl: CACHE_TTL.chart,
      buildParams: ([address, limit = 20, skip = 0]) => ({
        CandidateAddress: address,
        Limit: limit,
        Skip: skip,
      }),
      buildCacheParams: ([address, limit = 20, skip = 0]) => ({ address, limit, skip }),
    },
  },
  {
    // Shared, cached fetch of the node candidate set mapped to rows. Keyed by
    // network so getByAddress / getVotesByAddress reuse a single round-trip.
    async _getCandidateRows(options = {}) {
      const key = getCacheKey("candidate_rows_node", {});
      return cachedRequest(
        key,
        async () => {
          const rows = await safeRpc("getcandidates", [], null, options);
          return Array.isArray(rows) ? mapRpcCandidatesToCandidateRows(rows) : null;
        },
        CACHE_TTL.chart,
        options,
      );
    },

    async getCount(options = {}) {
      const key = getCacheKey("candidate_count_fallback", {});
      return cachedRequest(
        key,
        async () => {
          // Standard `getcandidates` is the canonical chain source — works
          // against any Neo node. The legacy GetCandidateCount RPC queried
          // a Mongo collection that's no longer populated (verified live
          // on /candidates). Same flip pattern as #178/#181/#182.
          const rows = await safeRpc("getcandidates", [], [], options);
          if (Array.isArray(rows)) {
            return { "total counts": rows.length };
          }
          // Fallback to the legacy Mongo wrapper only if the chain node
          // is unreachable (extremely rare).
          const rpcResult = await this._getCountRpc(options).catch(() => null);
          return rpcResult || { "total counts": 0 };
        },
        CACHE_TTL.stats,
        options,
      );
    },

    async getList(limit = 20, skip = 0, options = {}) {
      const key = getCacheKey("candidate_list_fallback", { limit, skip });
      return cachedRequest(
        key,
        async () => {
          // Standard `getcandidates` first — see getCount comment.
          const nativeRows = await safeRpc("getcandidates", [], [], options);
          if (Array.isArray(nativeRows) && nativeRows.length > 0) {
            const mapped = mapRpcCandidatesToCandidateRows(nativeRows);
            const safeSkip = Math.max(0, Number(skip) || 0);
            const safeLimit = Math.max(1, Number(limit) || 20);
            return {
              result: mapped.slice(safeSkip, safeSkip + safeLimit),
              totalCount: mapped.length,
            };
          }
          // Fallback to the legacy Mongo wrapper only if the chain node
          // is unreachable.
          const rpcResult = await this._getListRpc(limit, skip, options).catch(() => null);
          return rpcResult || { result: [], totalCount: 0 };
        },
        CACHE_TTL.chart,
        options,
      );
    },

    async getByAddress(address, options = {}) {
      const key = getCacheKey("candidate_by_address_node", { address: String(address || "") });
      return cachedRequest(
        key,
        async () => {
          // The legacy GetCandidateByAddress queried dead Mongo, so candidate
          // addresses showed no candidate status/votes. Derive both from the
          // node `getcandidates` set instead.
          const rows = await this._getCandidateRows(options);
          if (rows) {
            const row = matchCandidateRow(rows, address);
            if (!row) return null; // a valid address that is not a candidate
            return {
              candidate: row.candidate,
              candidatePubKey: row.publickey,
              publickey: row.publickey,
              votesOfCandidate: String(row.votes ?? "0"),
              votes: String(row.votes ?? "0"),
              isCommittee: row.active === true,
              active: row.active === true,
            };
          }
          // Node unreachable → legacy Mongo wrapper (last resort).
          return this._getByAddressRpc(address, options).catch(() => null);
        },
        CACHE_TTL.address,
        options,
      );
    },

    async getVotesByAddress(address, options = {}) {
      const key = getCacheKey("candidate_votes_node", { address: String(address || "") });
      return cachedRequest(
        key,
        async () => {
          const rows = await this._getCandidateRows(options);
          if (rows) {
            const row = matchCandidateRow(rows, address);
            return row ? String(row.votes ?? "0") : 0;
          }
          return this._getVotesByAddressRpc(address, options).catch(() => 0);
        },
        CACHE_TTL.stats,
        options,
      );
    },
  },
);

export default candidateService;
