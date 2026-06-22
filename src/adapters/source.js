/**
 * Source-precedence policy for the anti-corruption layer.
 *
 * Replaces the inline `try/catch` source cascade that services used to embed
 * directly in their fetch logic. A "source" pairs a raw fetcher with an
 * adapter that maps the raw payload into a canonical domain shape. The policy
 * tries sources in declared order and distinguishes three outcomes:
 *
 *   - data:      a source returned a non-empty payload → adapt and return it.
 *   - emptiness: every source resolved with no data (null/empty) → return the
 *                provided empty result (no error).
 *   - outage:    every source threw → throw a typed `SourceUnavailableError`
 *                so callers can tell "nothing to show" apart from "the backend
 *                is down".
 *
 * A source that throws OR resolves null/empty is skipped in favour of the next
 * source. The first source that yields data wins.
 *
 * @module adapters/source
 */

/**
 * Thrown when every configured source failed (threw). Distinct from the case
 * where sources succeeded but had no data — that returns an empty result.
 */
export class SourceUnavailableError extends Error {
  /**
   * @param {string} message
   * @param {{ errors?: Error[] }} [options]
   */
  constructor(message, { errors = [] } = {}) {
    super(message);
    this.name = "SourceUnavailableError";
    // The per-source errors, in source order, for diagnostics.
    this.errors = errors;
  }
}

/**
 * Treat null/undefined, empty arrays, and `{ items: [] }`-style empty pages as
 * "no data". Anything else (including `0`, `false`, non-empty objects) counts
 * as data.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isEmptyResult(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    if (Array.isArray(value.items)) return value.items.length === 0;
  }
  return false;
}

/**
 * @template T
 * @typedef {Object} Source
 * @property {string} name - Human-readable source identifier (for diagnostics).
 * @property {() => Promise<*>} fetch - Fetches the raw payload (may resolve null).
 * @property {(raw: *) => (T|null)} adapt - Maps the raw payload to a domain shape.
 */

/**
 * Try each source in order until one yields data.
 *
 * @template T
 * @param {Object} params
 * @param {Source<T>[]} params.sources - Sources in precedence order.
 * @param {T} [params.emptyResult] - Returned when all sources had no data.
 * @returns {Promise<T>} The adapted result, or `emptyResult` when nothing had data.
 * @throws {SourceUnavailableError} When every source threw.
 */
export async function fetchWithPolicy({ sources, emptyResult = null }) {
  const list = Array.isArray(sources) ? sources : [];
  const errors = [];
  let sawAttempt = false;

  for (const source of list) {
    if (!source || typeof source.fetch !== "function") continue;
    sawAttempt = true;
    try {
      const raw = await source.fetch();
      if (isEmptyResult(raw)) continue;

      const adapted = typeof source.adapt === "function" ? source.adapt(raw) : raw;
      if (isEmptyResult(adapted)) continue;

      return adapted;
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Every source that ran threw — surface an outage rather than masking it as
  // emptiness. (If no source ran at all, treat it as emptiness.)
  if (sawAttempt && errors.length > 0 && errors.length === list.filter((s) => s && typeof s.fetch === "function").length) {
    throw new SourceUnavailableError(
      `All ${errors.length} source(s) failed: ${errors.map((e) => e.message).join("; ")}`,
      { errors },
    );
  }

  return emptyResult;
}

export default fetchWithPolicy;
