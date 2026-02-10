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
    return { path: `/block-info/${data.hash || q}` };
  }

  if (type === "transaction") {
    return { path: `/transaction-info/${data.hash || q}` };
  }

  if (type === "contract") {
    return { path: `/contract-info/${data.hash || q}` };
  }

  if (type === "address") {
    return { path: `/account-profile/${q}` };
  }

  if (type === "token") {
    return { path: `/nep17-token-info/${data.hash || q}` };
  }

  return { path: "/search", query: { q } };
}

export default resolveSearchLocation;
