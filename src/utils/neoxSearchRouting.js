/**
 * Neo X search -> /x route resolution.
 *
 * The header search is shared across both chains. On /x it must resolve against
 * Neo X data and /x routes, not the N3 search service (whose NNS/typed hits would
 * otherwise hijack a Neo X query — e.g. "anti-mev" matching an NNS name and
 * routing to /nns). This mirrors resolveSearchLocation for the Neo X chain.
 *
 * Resolution order:
 *   1. a typed hit from the Blockscout-backed neox search service (its items
 *      already carry a /x/... route),
 *   2. defensive identifier routing (so a pasted hash/address still resolves if
 *      the search backend returns nothing),
 *   3. the offline natural-language intent/entity router (chain: "neox"),
 *   4. null (caller decides the fallback).
 */
import { resolveNlIntent } from "@/utils/nlIntent";

const EVM_TX_HASH = /^0x[0-9a-fA-F]{64}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BLOCK_HEIGHT = /^\d+$/;

/**
 * @param {string} query raw search input
 * @param {Array<{route?: string}>|null} results neox searchService.search() output
 * @returns {string | { path: string, query?: Record<string,string> } | null}
 */
export function resolveNeoxSearchLocation(query, results) {
  const q = String(query || "").trim();
  if (!q) return null;

  if (Array.isArray(results)) {
    const hit = results.find((item) => item && typeof item.route === "string" && item.route);
    if (hit) return hit.route;
  }

  if (EVM_TX_HASH.test(q)) return `/x/tx/${q}`;
  if (EVM_ADDRESS.test(q)) return `/x/address/${q}`;
  if (BLOCK_HEIGHT.test(q)) return `/x/block-info/${q}`;

  return resolveNlIntent(q, { chain: "neox" }) || null;
}
