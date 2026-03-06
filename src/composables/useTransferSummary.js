import { ref } from "vue";
import { tokenService } from "@/services";
import { formatTokenAmount } from "@/utils/explorerFormat";
import { scriptHashToAddress } from "@/utils/neoHelpers";

/**
 * Composable for lazily loading and caching transfer value summaries
 * for transaction list rows (NEP-17 / NEP-11 lookups by tx hash).
 */
export function useTransferSummary() {
  const transferSummaryByHash = ref({});
  const pendingHashes = new Set();

  function extractContractHash(item) {
    if (!item || typeof item !== "object") return null;
    return (
      item.contract ||
      item.contractHash ||
      item.contracthash ||
      item.contract_hash ||
      item.asset ||
      item.assetHash ||
      item.assethash ||
      null
    );
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
    const candidate =
      item.to ||
      item.toAddress ||
      item.toaddress ||
      item.receiver ||
      item.recipient ||
      "";
    return String(candidate || "").trim();
  }

  function extractSenderAddress(item) {
    if (!item || typeof item !== "object") return "";
    const candidate =
      item.from ||
      item.fromAddress ||
      item.fromaddress ||
      item.sender ||
      "";
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
      rows
        .map((item) => normalizeComparableAddress(extractSenderAddress(item)))
        .filter(Boolean)
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
        eligibleTransfers
          .map((item) => normalizeComparableAddress(extractRecipientAddress(item)))
          .filter(Boolean)
      ),
    ];
    const targetCount =
      uniqueRecipients.length || normalizeTotalCount(totalCount, rows.length || 1);
    const transferCount =
      eligibleTransfers.length || normalizeTotalCount(totalCount, rows.length || 1);

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

  async function loadSummary(hash) {
    if (!hash || transferSummaryByHash.value[hash] || pendingHashes.has(hash)) {
      return;
    }

    pendingHashes.add(hash);

    try {
      // Try NEP-17 first
      const nep17Res = await tokenService.getTransfersByTxHash(hash, 8, 0);
      const nep17Selection = selectPreferredTransfer(nep17Res?.result, nep17Res?.totalCount);
      const nep17 = nep17Selection.preferred;

      if (nep17) {
        const amount = formatTokenAmount(nep17.value ?? 0, Number(nep17.decimals ?? 0), 8);
        const symbol = nep17.symbol || nep17.tokenname || "Token";
        const suffix = extraTransferSuffix(nep17Selection.transferCount);
        setSummary(
          hash,
          buildSummary(
            {
              text: `${amount} ${symbol}${suffix}`,
              contract: extractContractHash(nep17),
              type: "NEP17",
            },
            nep17Selection.targetCount,
            nep17Selection.recipient
          )
        );
        return;
      }

      // Fallback to NEP-11
      const nep11Res = await tokenService.getNep11TransfersByTxHash(hash, 8, 0);
      const nep11Selection = selectPreferredTransfer(nep11Res?.result, nep11Res?.totalCount);
      const nep11 = nep11Selection.preferred;

      if (nep11) {
        const symbol = nep11.symbol || nep11.tokenname || "NFT";
        const tokenId = nep11.tokenid || nep11.tokenId;
        const suffix = extraTransferSuffix(nep11Selection.transferCount);
        const readableId = truncateTokenId(tokenId);
        setSummary(
          hash,
          buildSummary(
            {
              text: readableId ? `1 ${symbol} #${readableId}${suffix}` : `1 ${symbol}${suffix}`,
              contract: extractContractHash(nep11),
              type: "NEP11",
            },
            nep11Selection.targetCount,
            nep11Selection.recipient
          )
        );
        return;
      }

      setSummary(hash, { text: "\u2014", contract: null, type: null });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("Failed to load transaction transfer summary:", err);
      }
      setSummary(hash, { text: "\u2014", contract: null, type: null });
    } finally {
      pendingHashes.delete(hash);
    }
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

    const batchSize = 4;
    for (let i = 0; i < hashes.length; i += batchSize) {
      const batch = hashes.slice(i, i + batchSize);
      await Promise.all(batch.map((h) => loadSummary(h)));
    }
  }

  return {
    transferSummaryByHash,
    enrichTransactions,
  };
}
