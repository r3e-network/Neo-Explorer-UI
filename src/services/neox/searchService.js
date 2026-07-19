// Neo X search service — wraps Blockscout /search (typed results) and maps
// each hit to an in-app /x route.

import { fetchBlockscout } from "./blockscoutClient";
import { getNeoxNet } from "@/utils/neoxEnv";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();

/** Map a Blockscout search item to an /x route + display fields. */
function toResult(item) {
  if (!item || typeof item !== "object") return null;
  const type = String(item.type || "").toLowerCase();
  switch (type) {
    case "block":
      return {
        type: "block",
        label: item.block_number != null ? `Block #${item.block_number}` : item.block_hash,
        value: item.block_hash || String(item.block_number),
        route: `/x/block-info/${item.block_hash || item.block_number}`,
      };
    case "transaction":
      return {
        type: "transaction",
        label: item.transaction_hash || item.tx_hash,
        value: item.transaction_hash || item.tx_hash,
        route: `/x/tx/${item.transaction_hash || item.tx_hash}`,
      };
    case "token":
      return {
        type: "token",
        label: item.name || item.symbol || item.address_hash || item.address,
        value: item.address_hash || item.address,
        route: `/x/token/${item.address_hash || item.address}`,
      };
    case "address":
    case "contract":
      return {
        type,
        label: item.name || item.address_hash || item.address,
        value: item.address_hash || item.address,
        route: `/x/address/${item.address_hash || item.address}`,
      };
    default:
      return null;
  }
}

export const searchService = {
  /**
   * Typed search across Neo X. Returns mapped results with /x routes.
   * @returns {Promise<Array<{type:string,label:string,value:string,route:string}>>}
   */
  async search(query, opts = {}) {
    const q = String(query || "").trim();
    if (!q) return [];
    const data = await fetchBlockscout(netOf(opts), "search", { params: { q }, signal: opts.signal });
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map(toResult).filter(Boolean);
  },
};

export default searchService;
