/**
 * Route- and chain-aware suggested prompts for the AI assistant drawer.
 *
 * Pure module: no DOM, no Vue, no i18n runtime. Each entry carries a stable
 * `id`, an `agent.suggest.*` i18n key and the English default, so the calling
 * component resolves the visible string through its own `tf(key, fallback)`
 * helper. Only keys from the frozen `agent.suggest.*` contract appear here.
 *
 * A chip never sends: the panel populates the composer and focuses it, so a
 * suggestion can only ever be one step towards a wallet prompt, never the
 * whole trip.
 */

const SUGGESTIONS = Object.freeze({
  explainTx: Object.freeze({
    id: "explainTx",
    key: "agent.suggest.explainTx",
    fallback: "Explain this transaction",
  }),
  addressHoldings: Object.freeze({
    id: "addressHoldings",
    key: "agent.suggest.addressHoldings",
    fallback: "What tokens does this address hold?",
  }),
  contractSummary: Object.freeze({
    id: "contractSummary",
    key: "agent.suggest.contractSummary",
    fallback: "What does this contract do?",
  }),
  tokenHolders: Object.freeze({
    id: "tokenHolders",
    key: "agent.suggest.tokenHolders",
    fallback: "Who are the top holders of this token?",
  }),
  latestBlock: Object.freeze({
    id: "latestBlock",
    key: "agent.suggest.latestBlock",
    fallback: "What's in the latest block?",
  }),
  networkStatus: Object.freeze({
    id: "networkStatus",
    key: "agent.suggest.networkStatus",
    fallback: "How is the network doing right now?",
  }),
  gasPrice: Object.freeze({
    id: "gasPrice",
    key: "agent.suggest.gasPrice",
    fallback: "What are gas fees on Neo X right now?",
  }),
  proposeTransfer: Object.freeze({
    id: "proposeTransfer",
    key: "agent.suggest.proposeTransfer",
    fallback: "Help me prepare a GAS transfer to review",
  }),
});

/**
 * Path prefix -> contextual suggestion id. Canonical detail routes only,
 * verified against src/router/index.js:
 *   N3    /transaction-info/:txhash  /account-profile/:accountAddress  /contract-info/:hash
 *   Neo X /x/tx/:txhash  /x/address/:addr  /x/token/:hash
 * Order is evaluation order; the prefixes are mutually exclusive so no entry
 * can shadow another.
 */
const CONTEXT_PREFIXES = Object.freeze([
  Object.freeze({ prefix: "/transaction-info/", id: "explainTx" }),
  Object.freeze({ prefix: "/x/tx/", id: "explainTx" }),
  Object.freeze({ prefix: "/account-profile/", id: "addressHoldings" }),
  Object.freeze({ prefix: "/x/address/", id: "addressHoldings" }),
  Object.freeze({ prefix: "/contract-info/", id: "contractSummary" }),
  Object.freeze({ prefix: "/x/token/", id: "tokenHolders" }),
]);

/** Every suggestion id this module can emit, in declaration order. */
export const SUGGESTION_IDS = Object.freeze(Object.keys(SUGGESTIONS));

/** The prefix table, exposed so callers/tests can enumerate the mapping. */
export const CONTEXT_SUGGESTION_PREFIXES = CONTEXT_PREFIXES;

/**
 * Resolve the contextual suggestion for a route path.
 * @param {string} path
 * @returns {string|null} suggestion id, or null on a non-detail route
 */
export function contextSuggestionId(path) {
  if (typeof path !== "string" || path.length === 0) {
    return null;
  }
  const match = CONTEXT_PREFIXES.find((entry) => path.startsWith(entry.prefix));
  return match ? match.id : null;
}

/**
 * Build the suggested-prompt list for the current route and pinned chain.
 *
 * Shape: [contextual?] + latestBlock + (networkStatus | gasPrice) + proposeTransfer,
 * i.e. 3 entries on a generic route and 4 on a recognised detail route. The
 * propose-transaction chip is always present and always last so the flow that
 * ends at a wallet is never the first thing a user reaches for.
 *
 * @param {{ path?: string, chain?: string }} [options]
 * @returns {Array<{ id: string, key: string, fallback: string }>}
 */
export function buildSuggestions({ path = "/", chain = "n3" } = {}) {
  const suggestions = [];

  const contextId = contextSuggestionId(path);
  if (contextId) {
    suggestions.push(SUGGESTIONS[contextId]);
  }

  suggestions.push(SUGGESTIONS.latestBlock);
  suggestions.push(chain === "neox" ? SUGGESTIONS.gasPrice : SUGGESTIONS.networkStatus);
  suggestions.push(SUGGESTIONS.proposeTransfer);

  return suggestions;
}
