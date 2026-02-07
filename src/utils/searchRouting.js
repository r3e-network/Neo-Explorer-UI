/**
 * Centralized search → route mapping.
 *
 * The UI has multiple search boxes (header, homepage hero). Historically they
 * duplicated routing logic. Keeping it here makes layout refactors safe.
 */

/**
 * @param {string} query
 * @param {{ type?: string, data?: any } | null} result
 * @returns {{ path: string, query?: Record<string, string> } | null}
 */
export function resolveSearchLocation(query, result) {
  const q = (query || "").trim();
  if (!q) return null;

  const type = result?.type;
  const data = result?.data || {};

  if (type === "block") {
    return { path: `/blockinfo/${data.hash || q}` };
  }

  if (type === "transaction") {
    return { path: `/transactionInfo/${data.hash || q}` };
  }

  if (type === "contract") {
    return { path: `/contractinfo/${data.hash || q}` };
  }

  if (type === "address") {
    return { path: `/accountprofile/${q}` };
  }

  if (type === "token") {
    return { path: `/NEP17tokeninfo/${data.hash || q}` };
  }

  return { path: "/search", query: { q } };
}

export default resolveSearchLocation;
