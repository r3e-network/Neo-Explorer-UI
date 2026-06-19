import { GAS_HASH, NEO_HASH } from "@/constants";
import { addressToScriptHash, publicKeyToAddress } from "@/utils/neoHelpers";

function normalizeHash(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

function asCount(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function buildBalanceLookup(rows = []) {
  // Balance rows carry a real Neo base58 address — keep the case so we can
  // look it up directly from the same address on the overview row.
  const balances = new Map();

  for (const row of rows) {
    const address = String(row?.address || "").trim();
    const contractHash = normalizeHash(row?.contract_hash || row?.contractHash || "");
    if (!address || !contractHash) continue;

    if (!balances.has(address)) {
      balances.set(address, {});
    }
    balances.get(address)[contractHash] = String(row?.balance_raw ?? row?.balanceRaw ?? "0");
  }

  return balances;
}

export function mapAccountOverviewRowsToAccounts(rows = [], balanceRows = []) {
  const balanceLookup = buildBalanceLookup(balanceRows);

  return [...(Array.isArray(rows) ? rows : [])]
    .map((row) => {
      const address = String(row?.address || "").trim();
      const scriptHash = normalizeHash(addressToScriptHash(address) || "");
      const assetBalances = balanceLookup.get(address) || {};
      const txSent = asCount(row?.tx_sent);
      const txSigned = asCount(row?.tx_signed);

      return {
        address,
        scripthash: scriptHash,
        neobalance: assetBalances[normalizeHash(NEO_HASH)] || "0",
        gasbalance: assetBalances[normalizeHash(GAS_HASH)] || "0",
        txCount: txSent + txSigned,
        nep11TransferCount: asCount(row?.nep11_sent_events) + asCount(row?.nep11_received_events),
        lastTransactionTime: asCount(row?.last_tx_ms),
      };
    });
}

export function mapRpcCandidatesToCandidateRows(rows = []) {
  return [...(Array.isArray(rows) ? rows : [])]
    .map((row) => {
      const publickey = String(row?.publickey || row?.publicKey || "").trim();
      if (!publickey) return null;

      const address = publicKeyToAddress(publickey);
      const candidate = addressToScriptHash(address) || address || publickey;

      return {
        candidate,
        publickey,
        votes: String(row?.votes ?? "0"),
        isCommittee: row?.active === true,
        active: row?.active === true,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0));
}
