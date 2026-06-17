// PostgREST query-value helpers.
//
// PostgREST filter values are interpolated into URL query strings as
// `?<col>=eq.<val>` or `?<col>=in.(a,b,c)`. Because the value is also a
// mini-DSL (commas separate `in.()` items, parens terminate the list,
// `>`,`<`,`!` introduce other operators), naively string-concatenating a
// caller-supplied hash/address/token-id into the predicate can break the
// predicate or smuggle a second one. Most callers pass already-validated
// hex hashes, but these services are general-purpose and not every caller
// validates.
//
// These helpers validate the value against the expected Neo shape (hex hash /
// txid / address) and reject anything containing PostgREST-DSL metacharacters
// before building the predicate, so a malformed or hostile value can never
// escape its intended column/operator.

const HEX40 = /^0x[0-9a-f]{40}$/i;
const HEX64 = /^0x[0-9a-f]{64}$/i;
const PLAIN_HEX = /^[0-9a-f]+$/i;
// Neo N3 base58 addresses (25 bytes): start with N, base58, ~34 chars.
const NEO_ADDRESS = /^N[1-9A-HJ-NP-Za-km-z]{20,40}$/;

function normalizeHex(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

/** Returns a validated, lowercased 0x-prefixed hash or "" if invalid. */
export function safeHash(value) {
  const h = normalizeHex(value);
  if (HEX40.test(h) || HEX64.test(h)) return h;
  return "";
}

/** Returns a validated Neo base58 address or "" if invalid. */
export function safeAddress(value) {
  const a = String(value || "").trim();
  return NEO_ADDRESS.test(a) ? a : "";
}

/**
 * Build a PostgREST `eq.<value>` predicate for a hash/txid. Returns "" if the
 * value is not a valid 40/64-bit hex hash, so the caller can skip the query.
 */
export function eqHash(value) {
  const h = safeHash(value);
  return h ? `eq.${h}` : "";
}

/** Build a PostgREST `eq.<value>` predicate for a Neo address. */
export function eqAddress(value) {
  const a = safeAddress(value);
  return a ? `eq.${a}` : "";
}

/**
 * Build a PostgREST `in.(a,b,c)` predicate for a list of hash/txid values.
 * Each item is validated; invalid items are dropped. Returns "" if no valid
 * items remain, so a crafted item cannot smuggle a comma/paren into the list.
 */
export function inHashes(values) {
  const list = Array.isArray(values) ? values : [];
  const cleaned = [];
  for (const v of list) {
    const h = safeHash(v);
    if (h) cleaned.push(h);
  }
  return cleaned.length ? `in.(${cleaned.join(",")})` : "";
}

/**
 * Build a PostgREST `in.(a,b,c)` predicate for a list of Neo addresses.
 * Each item is validated; invalid items are dropped.
 */
export function inAddresses(values) {
  const list = Array.isArray(values) ? values : [];
  const cleaned = [];
  for (const v of list) {
    const a = safeAddress(v);
    if (a) cleaned.push(a);
  }
  return cleaned.length ? `in.(${cleaned.join(",")})` : "";
}

/**
 * Sanitize a NEP-11 token id for use as an `eq.` predicate value. NEP-11 token
 * ids can be arbitrary bytes, so we cannot constrain them to a fixed shape;
 * instead we reject any value containing PostgREST-DSL metacharacters (comma,
 * parens, quotes, backslash, whitespace) that could break out of the value.
 */
const TOKEN_ID_FORBIDDEN = /[,()"\\\s]/;
export function safeTokenId(value) {
  const t = String(value || "").trim();
  if (!t) return "";
  if (TOKEN_ID_FORBIDDEN.test(t)) return "";
  // Bound the length to avoid pathological inputs.
  if (t.length > 512) return "";
  return t;
}

/** Clamp a pagination limit to a safe maximum. */
export function clampLimit(limit, fallback = 20, max = 200) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  if (n > max) return max;
  return Math.floor(n);
}

/** Clamp a pagination offset to a non-negative integer. */
export function clampOffset(offset, max = 1_000_000) {
  const n = Number(offset);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > max) return max;
  return Math.floor(n);
}

// Re-exported for callers that already use plain hex without 0x in a context
// where only hex characters are permitted (e.g. already-validated raw ids).
export { PLAIN_HEX };
