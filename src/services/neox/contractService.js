// Neo X smart-contract service — Blockscout v2 verified-contract metadata.
//
// Returns the Blockscout payload as-is (snake_case) because the contract tab
// consumes nearly every field verbatim (multi-file sources, ABI, compiler
// settings) and re-mapping 30+ keys would only invite drift.

import { fetchBlockscout, LIST_TIMEOUT_MS } from "./blockscoutClient";
import { getNeoxNet } from "@/utils/neoxEnv";

const netOf = (opts) => (typeof opts === "string" ? opts : opts?.net) || getNeoxNet();
const cursorParams = (opts) => (opts?.cursor && typeof opts.cursor === "object" ? { ...opts.cursor } : {});

export const contractService = {
  /**
   * Cursor page of verified smart contracts, optionally filtered by search.
   *
   * Items stay in the raw Blockscout shape (address.{hash,name},
   * compiler_version, language, license_type, optimization_enabled,
   * verified_at, transactions_count, coin_balance, certified) because the
   * directory view consumes them verbatim.
   *
   * @param {Object|string} [opts] - { net, signal, cursor, q } or a net id.
   * @returns {Promise<{items: Object[], nextPageParams: Object|null}>}
   */
  async getList(opts = {}) {
    const params = cursorParams(opts);
    if (opts.q) params.q = String(opts.q);
    const data = await fetchBlockscout(netOf(opts), "smart-contracts", {
      params,
      signal: opts.signal,
      timeoutMs: LIST_TIMEOUT_MS,
    });
    return { items: Array.isArray(data?.items) ? data.items : [], nextPageParams: data?.next_page_params ?? null };
  },

  /**
   * Network-wide smart-contract counters.
   *
   * @param {Object|string} [opts] - { net, signal } or a net id string.
   * @returns {Promise<Object|null>} Raw counters payload
   *   ({ smart_contracts, verified_smart_contracts,
   *   new_verified_smart_contracts_24h, … }) or null on 404.
   */
  async getCounters(opts = {}) {
    const data = await fetchBlockscout(netOf(opts), "smart-contracts/counters", { signal: opts.signal });
    return data ?? null;
  },

  /**
   * Verified smart-contract detail for an address.
   *
   * @param {string} hash - Contract address ("0x…").
   * @param {Object|string} [opts] - { net, signal } or a net id string.
   * @returns {Promise<Object|null>} Raw Blockscout smart-contract payload
   *   (is_verified, source_code, additional_sources[], abi, language,
   *   compiler_version, evm_version, optimization_enabled, optimization_runs,
   *   constructor_args, decoded_constructor_args, creation_bytecode,
   *   deployed_bytecode, verified_at, license_type, file_path,
   *   external_libraries, proxy_type, implementations, certified, …),
   *   or null when the contract is unknown/unverified (404).
   */
  async getSmartContract(hash, opts = {}) {
    const data = await fetchBlockscout(netOf(opts), `smart-contracts/${encodeURIComponent(hash)}`, {
      signal: opts.signal,
    });
    return data ?? null;
  },
};

export default contractService;
