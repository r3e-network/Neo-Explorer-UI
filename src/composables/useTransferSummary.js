import { ref } from "vue";
import { tokenService } from "@/services/tokenService";
import { formatTokenAmount } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/utils/neoHelpers";
import { NATIVE_CONTRACTS } from "@/constants";

const CONTRACT_HASH_ALIASES = [
  "contract",
  "contractHash",
  "contracthash",
  "contract_hash",
  "asset",
  "assetHash",
  "assethash",
];

// Module-level decimals cache for the tx-list "Value" column. Keyed by
// lowercased contract hash. Populated lazily via tokenService — entries
// are reused across all useTransferSummary instances on the page.
// Without this, the indexer's amount_raw (which carries no decimals
// column on nep17_transfers) renders as a raw integer for every
// non-NEO/non-GAS NEP-17 — e.g. an 8-decimal token of 1.0 shows "100000000".
const tokenDecimalsCache = new Map();

async function ensureDecimalsCached(contractHashes) {
  const missing = [];
  for (const ch of contractHashes) {
    const k = String(ch || "").toLowerCase();
    if (!k || NATIVE_CONTRACTS[k] || tokenDecimalsCache.has(k)) continue;
    missing.push(k);
  }
  if (missing.length === 0) return;
  await Promise.all(
    missing.map(async (k) => {
      try {
        const meta = await tokenService.getByHashWithFallback(k);
        if (meta && typeof meta.decimals !== "undefined" && meta.decimals !== null) {
          tokenDecimalsCache.set(k, Number(meta.decimals));
        } else {
          // Remember we tried (don't refetch on the next page render).
          tokenDecimalsCache.set(k, null);
        }
      } catch (_e) {
        tokenDecimalsCache.set(k, null);
      }
    }),
  );
}

// Resolve symbol + decimals for a contract hash. Native NEO/GAS are
// well-known and resolved synchronously. For non-natives, prefer (in order):
// row.decimals (rare; indexer doesn't carry it), the populated
// tokenDecimalsCache, and finally 0 as a safe-but-imperfect last resort.
function resolveTokenMeta(contractHash, row) {
  const hash = String(contractHash || "").toLowerCase();
  const native = NATIVE_CONTRACTS[hash];
  if (native?.symbol) {
    return { symbol: native.symbol, decimals: Number(native.decimals ?? 0) };
  }
  const rowDecimals = row?.decimals;
  if (rowDecimals !== undefined && rowDecimals !== null) {
    return {
      symbol: row?.symbol || row?.tokenname || "",
      decimals: Number(rowDecimals),
    };
  }
  const cached = tokenDecimalsCache.get(hash);
  return {
    symbol: row?.symbol || row?.tokenname || "",
    decimals: cached === null || cached === undefined ? 0 : Number(cached),
  };
}

/**
 * Composable for lazily loading and caching transfer value summaries
 * for transaction list rows (NEP-17 / NEP-11 lookups by tx hash).
 */
export function useTransferSummary() {
  const transferSummaryByHash = ref({});
  const pendingHashes = new Set();

  function extractContractHash(item) {
    if (!item || typeof item !== "object") return null;
    for (const key of CONTRACT_HASH_ALIASES) {
      if (item[key]) return item[key];
    }
    return null;
  }

  function setSummary(hash, summary) {
    transferSummaryByHash.value = {
      ...transferSummaryByHash.value,
      [hash]: summary,
    };
  }

  function truncateTokenId(tokenId, start = 8, end = 6) {
    if (!tokenId) return "";
    const value = String(tokenId);
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
  }

  function extraTransferSuffix(totalCount) {
    const extra = Math.max(0, Number(totalCount || 0) - 1);
    return extra > 0 ? ` +${extra}` : "";
  }

  function normalizeTotalCount(value, fallback = 1) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
    return fallback;
  }

  function extractRecipientAddress(item) {
    if (!item || typeof item !== "object") return "";
    const candidate = item.to || item.toAddress || item.toaddress || item.receiver || item.recipient || "";
    return String(candidate || "").trim();
  }

  function extractSenderAddress(item) {
    if (!item || typeof item !== "object") return "";
    const candidate = item.from || item.fromAddress || item.fromaddress || item.sender || "";
    return String(candidate || "").trim();
  }

  function normalizeComparableAddress(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return scriptHashToAddress(raw) || raw;
  }

  function selectPreferredTransfer(result = [], totalCount = 0) {
    const rows = Array.isArray(result) ? result.filter(Boolean) : [];
    if (!rows.length) {
      return {
        preferred: null,
        recipient: "",
        targetCount: normalizeTotalCount(totalCount, 0),
        transferCount: normalizeTotalCount(totalCount, 0),
      };
    }

    const senderSet = new Set(
      rows.map((item) => normalizeComparableAddress(extractSenderAddress(item))).filter(Boolean),
    );

    const eligibleTransfers = rows.filter((item) => {
      const recipient = normalizeComparableAddress(extractRecipientAddress(item));
      if (!recipient) return false;
      return !senderSet.has(recipient);
    });

    const preferred = eligibleTransfers[0] || rows[0] || null;
    const recipient = extractRecipientAddress(preferred);
    const uniqueRecipients = [
      ...new Set(
        eligibleTransfers.map((item) => normalizeComparableAddress(extractRecipientAddress(item))).filter(Boolean),
      ),
    ];
    const targetCount = uniqueRecipients.length || normalizeTotalCount(totalCount, rows.length || 1);
    const transferCount = eligibleTransfers.length || normalizeTotalCount(totalCount, rows.length || 1);

    return { preferred, recipient, targetCount, transferCount };
  }

  function buildSummary(base, totalCount, recipient) {
    const targetCount = normalizeTotalCount(totalCount, 1);
    const singleTarget = Boolean(recipient) && targetCount === 1;

    return {
      ...base,
      targetCount,
      recipient: recipient || null,
      recipientType: singleTarget ? "address" : null,
      singleTarget,
    };
  }

  function applyTransferBucket(hash, transfers, standard) {
    if (!transfers || transfers.length === 0) return false;

    const selection = selectPreferredTransfer(transfers, transfers.length);
    const preferred = selection.preferred;
    if (!preferred) return false;

    if (standard === "nep17") {
      const contractHash = extractContractHash(preferred);
      const meta = resolveTokenMeta(contractHash, preferred);
      // The indexer's nep17_transfers row gives unscaled `amount_raw`
      // (and `amount_text` is unfortunately just a copy of it for many
      // contracts including GAS). Always scale by the contract's
      // decimals — falling back to 0 only when the contract is truly
      // unknown.
      const amount = formatTokenAmount(preferred.value ?? preferred.amount ?? 0, meta.decimals, 8);
      const suffix = extraTransferSuffix(selection.transferCount);
      // Drop the literal "Token" placeholder when no real symbol is
      // available — the bare number is more honest than "<n> Token".
      const text = meta.symbol
        ? `${amount} ${meta.symbol}${suffix}`
        : `${amount}${suffix}`;
      setSummary(
        hash,
        buildSummary(
          {
            text,
            contract: contractHash,
            type: "NEP17",
          },
          selection.targetCount,
          selection.recipient,
        ),
      );
    } else {
      const contractHash = extractContractHash(preferred);
      const meta = resolveTokenMeta(contractHash, preferred);
      const tokenId = preferred.tokenid || preferred.tokenId;
      const suffix = extraTransferSuffix(selection.transferCount);
      const readableId = truncateTokenId(tokenId);
      // Same suffix-suppression idea as NEP-17: omit the generic "NFT"
      // placeholder when no real symbol is known. With a tokenId we
      // still show "#<id>" so the row stays informative.
      let text;
      if (meta.symbol && readableId) text = `1 ${meta.symbol} #${readableId}${suffix}`;
      else if (meta.symbol) text = `1 ${meta.symbol}${suffix}`;
      else if (readableId) text = `#${readableId}${suffix}`;
      else text = `1${suffix}`;
      setSummary(
        hash,
        buildSummary(
          {
            text,
            contract: contractHash,
            type: "NEP11",
          },
          selection.targetCount,
          selection.recipient,
        ),
      );
    }
    return true;
  }

  async function enrichTransactions(txList, { maxItems = 8 } = {}) {
    const hashes = (txList || [])
      .filter((tx) => {
        const hash = tx?.hash;
        if (!hash || transferSummaryByHash.value[hash] || pendingHashes.has(hash)) {
          return false;
        }
        return Number(tx?.value ?? 0) <= 0;
      })
      .map((tx) => tx.hash)
      .slice(0, Math.max(0, Number(maxItems) || 0));

    if (hashes.length === 0) return;

    hashes.forEach((h) => pendingHashes.add(h));

    try {
      // 2 batched PostgREST queries (NEP-17, then NEP-11 for whichever
      // txids didn't have NEP-17 transfers) instead of one fetch per row.
      const nep17Buckets = await tokenService.getTransfersByTxHashesBatch(hashes, "nep17");

      // Pre-warm the per-contract decimals cache for every non-native
      // contract in this batch. Without this, applyTransferBucket below
      // would scale amount_raw against 0 decimals for unknown NEP-17s
      // (the indexer's nep17_transfers view doesn't carry a decimals
      // column), making 1.0-of-X tokens render as raw integers like
      // "100000000 X".
      const contractHashes = new Set();
      for (const bucket of nep17Buckets.values()) {
        for (const t of bucket || []) {
          const ch = extractContractHash(t);
          if (ch) contractHashes.add(String(ch).toLowerCase());
        }
      }
      if (contractHashes.size) {
        await ensureDecimalsCached(contractHashes);
      }

      const remaining = [];
      for (const hash of hashes) {
        if (applyTransferBucket(hash, nep17Buckets.get(hash), "nep17")) continue;
        remaining.push(hash);
      }

      if (remaining.length > 0) {
        const nep11Buckets = await tokenService.getTransfersByTxHashesBatch(remaining, "nep11");
        for (const hash of remaining) {
          if (applyTransferBucket(hash, nep11Buckets.get(hash), "nep11")) continue;
          setSummary(hash, { text: "—", contract: null, type: null });
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("Failed to load transaction transfer summary batch:", err);
      }
      for (const hash of hashes) {
        if (!transferSummaryByHash.value[hash]) {
          setSummary(hash, { text: "—", contract: null, type: null });
        }
      }
    } finally {
      hashes.forEach((h) => pendingHashes.delete(h));
    }
  }

  return {
    transferSummaryByHash,
    enrichTransactions,
  };
}
