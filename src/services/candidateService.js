import { cachedRequest, getCacheKey, CACHE_TTL } from "./cache";
import { createService } from "./serviceFactory";
import { safeRpc } from "./api";
import { mapRpcCandidatesToCandidateRows } from "./mappers";
import { indexerReadService } from "./indexerReadService";
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
  {},
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
          // Standard `getcandidates` is the canonical chain source and works
          // against any Neo node.
          const rows = await safeRpc("getcandidates", [], [], options);
          if (Array.isArray(rows)) {
            return { "total counts": rows.length };
          }
          return { "total counts": 0 };
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
          return { result: [], totalCount: 0 };
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
          // Derive candidate status/votes from the node `getcandidates` set.
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
          return null;
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
          return 0;
        },
        CACHE_TTL.stats,
        options,
      );
    },

    // Current voters for a candidate, derived from the NEO contract's Vote
    // notifications via the indexer. `publicKey` is the candidate's compressed public
    // key (hex). Returns voters with a 0x script hash + their voted amount.
    async getVotersByAddress(publicKey, limit = 20, skip = 0, options = {}) {
      const pk = String(publicKey || "").trim();
      const key = getCacheKey("candidate_voters_node", { pk, limit, skip });
      return cachedRequest(
        key,
        async () => {
          try {
            if (pk) {
              const payload = await indexerReadService.getCandidateVoters(pk, limit, skip, options);
              if (payload && payload.data) {
                const rows = Array.isArray(payload.data) ? payload.data : [];
                return {
                  result: rows.map((r) => ({
                    voter: r.script_hash,
                    balanceOfVoter: String(r.votes ?? "0"),
                  })),
                  totalCount: Number(payload?.meta?.total ?? rows.length),
                };
              }
            }
          } catch {
            // fall through to the empty no-data state
          }
          return { result: [], totalCount: 0 };
        },
        CACHE_TTL.chart,
        options,
      );
    },
  },
);

export default candidateService;
