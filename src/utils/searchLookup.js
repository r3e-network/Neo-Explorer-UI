const SEARCH_LOOKUP_TIMEOUT_MS = 2500;

export async function resolveSearchResultWithTimeout(searchFn, query, timeoutMs = SEARCH_LOOKUP_TIMEOUT_MS) {
  if (typeof searchFn !== "function") return null;

  let timeoutId = null;
  const lookupPromise = Promise.resolve()
    .then(() => searchFn(query))
    .catch(() => null);

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([lookupPromise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
