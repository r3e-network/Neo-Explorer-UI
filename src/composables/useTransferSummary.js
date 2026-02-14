import { ref } from "vue";
import { tokenService } from "@/services";
import { formatGas, formatTokenAmount } from "@/utils/explorerFormat";

/**
 * Composable for lazily loading and caching transfer value summaries
 * for transaction list rows (NEP-17 / NEP-11 lookups by tx hash).
 */
export function useTransferSummary() {
  const transferSummaryByHash = ref({});
  const pendingHashes = new Set();

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

  async function loadSummary(hash) {
    if (!hash || transferSummaryByHash.value[hash] || pendingHashes.has(hash)) {
      return;
    }

    pendingHashes.add(hash);

    try {
      // Try NEP-17 first
      const nep17Res = await tokenService.getTransfersByTxHash(hash, 1, 0);
      const nep17 = nep17Res?.result?.[0];

      if (nep17) {
        const amount = formatTokenAmount(nep17.value ?? 0, Number(nep17.decimals ?? 0), 8);
        const symbol = nep17.symbol || nep17.tokenname || "Token";
        const suffix = extraTransferSuffix(nep17Res?.totalCount);
        setSummary(hash, `${amount} ${symbol}${suffix}`);
        return;
      }

      // Fallback to NEP-11
      const nep11Res = await tokenService.getNep11TransfersByTxHash(hash, 1, 0);
      const nep11 = nep11Res?.result?.[0];

      if (nep11) {
        const symbol = nep11.symbol || nep11.tokenname || "NFT";
        const tokenId = nep11.tokenid || nep11.tokenId;
        const suffix = extraTransferSuffix(nep11Res?.totalCount);
        const readableId = truncateTokenId(tokenId);
        setSummary(hash, readableId ? `1 ${symbol} #${readableId}${suffix}` : `1 ${symbol}${suffix}`);
        return;
      }

      setSummary(hash, "\u2014");
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("Failed to load transaction transfer summary:", err);
      }
      setSummary(hash, "\u2014");
    } finally {
      pendingHashes.delete(hash);
    }
  }

  async function enrichTransactions(txList) {
    const hashes = (txList || [])
      .filter((tx) => {
        const hash = tx?.hash;
        if (!hash || transferSummaryByHash.value[hash] || pendingHashes.has(hash)) {
          return false;
        }
        return Number(tx?.value ?? 0) <= 0;
      })
      .map((tx) => tx.hash);

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
