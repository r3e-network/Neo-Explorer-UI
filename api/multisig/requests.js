const { query } = require("../lib/db");
const { enforceMultisigMutationPolicy } = require("../lib/multisigMutations");
const { callWithRpcEndpointFallback, normalizeNetwork } = require("../lib/rpcEndpoints");
const { enforceMutationSameOrigin } = require("../lib/sameOriginGuard");

// Dependency seam for tests, mirroring api/multisig/requests/[id].js: the
// vitest/Vite module graph does not instrument these API handlers' CJS
// require()s, so vi.mock cannot intercept the db module. The handler calls
// through this mutable reference, which tests can override via
// module.exports._internal.setDepsForTests(). Production uses the real impl.
let _query = query;

function cors(res) {
  // Tightened from `*`: the explorer SPA calls these endpoints via same-origin
  // relative URLs, so we only need to admit the explorer's own origins.
  // Reflecting the request Origin (validated against the explorer allowlist)
  // keeps the same-origin SPA working while blocking third-party sites from
  // issuing credentialed cross-origin mutations.
  res.setHeader("Access-Control-Allow-Origin", "https://www.neo3scan.com");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// List pagination bounds. The board views poll this unauthenticated endpoint;
// without a cap the response grows with the table and eventually hard-fails at
// Vercel's ~4.5MB response body limit.
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const MAX_LIST_OFFSET = 10000;

// Mirrors the PATCH handler's status validation (api/multisig/requests/[id].js).
const STATUS_FILTER_PATTERN = /^[a-z0-9_-]{1,32}$/i;

// Caller-controlled committee fields. These MUST NOT be trusted from the
// request body: downstream signature verification (api/lib/governanceSignature.js
// -> resolveCommitteePubkeys) treats params.committee_pubkeys / committee /
// pubkeys as the canonical committee membership set. An unauthenticated POST
// could otherwise pin an attacker-controlled committee and have attacker
// pubkeys pass the membership check.
const COMMITTEE_PARAM_FIELDS = ["committee_pubkeys", "committee", "pubkeys"];

function normalizePubkeyHex(value) {
  return String(value || "").trim().replace(/^0x/i, "").toLowerCase();
}

// Only OFFICIAL-council governance requests may pin the server-resolved
// canonical committee. Custom-group multisig (MultiSigTool) and lab-mode
// governance (GovernanceCreateModal, params.governance_mode === "lab") define
// their OWN signer set — that is the whole feature — so their declared signer
// set must be preserved, not overwritten with the live committee.
//
// The security invariant that must never weaken: an unauthenticated POST must
// not be able to forge the OFFICIAL committee and have attacker pubkeys pass
// the downstream membership check. That is enforced here by forcing the
// canonical set (and stripping caller aliases) whenever governance_mode is
// "official". Custom/lab requests are caller-defined by design; their signer
// set only ever authorizes signatures on that same caller-defined request, so
// trusting the declared set does not cross a trust boundary.
function paramsRequestOfficialCommittee(params) {
  if (!params || typeof params !== "object") return false;
  return String(params.governance_mode || "").trim().toLowerCase() === "official";
}

async function resolveCanonicalCommittee(network) {
  const committee = await callWithRpcEndpointFallback(network, async (url) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getcommittee", params: [] }),
      signal: AbortSignal.timeout(Number(process.env.RPC_FETCH_TIMEOUT_MS) || 4000),
    });
    if (!res.ok) throw new Error(`getcommittee HTTP ${res.status}`);
    const json = await res.json();
    if (json?.error) throw new Error(json.error.message || "getcommittee RPC error");
    return json?.result;
  });

  const pubkeys = Array.isArray(committee)
    ? committee.map(normalizePubkeyHex).filter(Boolean)
    : [];
  if (!pubkeys.length) {
    throw new Error("getcommittee returned an empty committee set.");
  }
  return pubkeys;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const network = String(req.query.network || "").trim() || null;

      // Migration safety: `?full=1` preserves today's response shape verbatim
      // (all row columns incl. unsigned_tx/params blobs, plus every signature
      // column incl. witness data) so any straggler client keeps working while
      // the boards migrate to the projected default + per-id refetch.
      if (String(req.query.full || "").trim() === "1") {
        let sql = `
        SELECT r.*,
          coalesce(
            json_agg(
              json_build_object(
                'id', s.id,
                'request_id', s.request_id,
                'signer_address', s.signer_address,
                'signature', s.signature,
                'public_key', s.public_key,
                'witness', s.witness,
                'invocation_script', s.invocation_script,
                'verification_script', s.verification_script,
                'metadata', s.metadata,
                'created_at', s.created_at
              )
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) AS signatures
        FROM multisig_requests r
        LEFT JOIN multisig_signatures s ON s.request_id = r.id
      `;
        const params = [];

        if (network) {
          params.push(network);
          sql += ` WHERE (r.network = $1 OR r.network_mode = $1)`;
        }

        sql += ` GROUP BY r.id ORDER BY r.created_at DESC LIMIT 500`;

        const { rows } = await _query(sql, params);
        // Parse the JSON-aggregated signatures
        for (const row of rows) {
          if (typeof row.signatures === "string") {
            row.signatures = JSON.parse(row.signatures);
          }
        }
        return res.status(200).json(rows);
      }

      // Default: a bounded, projected summary list. The board views render
      // only summary fields; the sign/assemble flows refetch the full record
      // via /api/multisig/requests/[id]. The projection strips exactly the
      // unbounded blob classes (row unsigned_tx, params.unsigned_tx,
      // params.signature_metadata, params.committee_verification_script,
      // params.broadcast_witness, metadata.broadcast_witness, and all
      // per-signature witness/script/signature payloads) while keeping every
      // field the list rendering and client-side filters read.
      const status = String(req.query.status || "").trim();
      if (status && !STATUS_FILTER_PATTERN.test(status)) {
        return res.status(400).json({ error: "Invalid status filter." });
      }

      const limitRaw = Number.parseInt(String(req.query.limit ?? ""), 10);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), MAX_LIST_LIMIT)
        : DEFAULT_LIST_LIMIT;
      const offsetRaw = Number.parseInt(String(req.query.offset ?? ""), 10);
      const offset = Number.isFinite(offsetRaw)
        ? Math.min(Math.max(offsetRaw, 0), MAX_LIST_OFFSET)
        : 0;

      const where = [];
      const params = [];
      if (network) {
        params.push(network);
        where.push(`(r.network = $${params.length} OR r.network_mode = $${params.length})`);
      }
      if (status) {
        params.push(status);
        where.push(`r.status = $${params.length}`);
      }
      params.push(limit);
      const limitIdx = params.length;
      params.push(offset);
      const offsetIdx = params.length;

      const sql = `
        SELECT (
          to_jsonb(r) - 'unsigned_tx'
          || jsonb_build_object(
            'params',
            CASE
              WHEN jsonb_typeof(to_jsonb(r) -> 'params') = 'object'
                THEN (to_jsonb(r) -> 'params')
                  - 'unsigned_tx'
                  - 'signature_metadata'
                  - 'committee_verification_script'
                  - 'broadcast_witness'
              ELSE to_jsonb(r) -> 'params'
            END,
            'metadata',
            CASE
              WHEN jsonb_typeof(to_jsonb(r) -> 'metadata') = 'object'
                THEN (to_jsonb(r) -> 'metadata') - 'broadcast_witness'
              ELSE to_jsonb(r) -> 'metadata'
            END,
            'signatures', coalesce(sigs.signatures, '[]'::jsonb)
          )
        ) AS request
        FROM multisig_requests r
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object('id', s.id, 'signer_address', s.signer_address)
            ORDER BY s.id
          ) AS signatures
          FROM multisig_signatures s
          WHERE s.request_id = r.id
        ) sigs ON true
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `;

      const { rows } = await _query(sql, params);
      return res.status(200).json(rows.map((row) => row.request));
    }

    if (req.method === "POST") {
      // Block cross-origin mutations (CSRF). The legitimate explorer SPA is
      // same-origin, so its Origin/Referer host is always allowed; a
      // third-party site cannot forge the Origin header.
      if (!enforceMutationSameOrigin(req, res)) {
        return;
      }
      const body = req.body || {};
      if (!enforceMultisigMutationPolicy(req, res, {
        operation: "create-request",
        key: `${body.network || body.network_mode || "unknown"}:${body.creator_address || "unknown"}`,
      })) {
        return;
      }

      // Committee handling is SCOPED by request kind:
      //
      //  * OFFICIAL-council governance (params.governance_mode === "official"):
      //    resolve the canonical committee server-side and overwrite any
      //    caller-supplied committee/allowlist fields. We never trust the
      //    committee set from the request body here — it gates signature
      //    verification downstream and could otherwise let an unauthenticated
      //    POST pin an attacker committee. If we cannot resolve the canonical
      //    set, reject rather than store an unverifiable (caller-pinned) one.
      //
      //  * Custom-group multisig / lab-mode governance (declares a signer set
      //    but is NOT official): preserve the caller's declared signer set
      //    verbatim. These flows are caller-defined by design (that is the
      //    feature); the declared set only ever authorizes signatures on that
      //    same caller-created request, so it does not cross a trust boundary.
      //    Stripping it (the previous behavior) broke both features end-to-end.
      const requestNetwork = normalizeNetwork(body.network || body.network_mode);
      const incomingParams =
        body.params && typeof body.params === "object" && !Array.isArray(body.params)
          ? body.params
          : null;

      let sanitizedParams = incomingParams;
      if (paramsRequestOfficialCommittee(incomingParams)) {
        let resolvedCommittee = null;
        try {
          resolvedCommittee = await resolveCanonicalCommittee(requestNetwork);
        } catch (committeeErr) {
          console.error("[api/multisig/requests] committee resolution failed:", committeeErr);
          return res.status(502).json({
            error: "Unable to resolve the canonical committee server-side; refusing to trust a caller-supplied committee.",
          });
        }

        sanitizedParams = { ...(incomingParams || {}) };
        // Strip any caller-provided committee aliases, then pin the
        // server-resolved canonical set so downstream verification only ever
        // trusts pubkeys derived here for official-council requests.
        for (const field of COMMITTEE_PARAM_FIELDS) {
          delete sanitizedParams[field];
        }
        sanitizedParams.committee_pubkeys = resolvedCommittee;
      }

      const columns = [];
      const values = [];
      const placeholders = [];

      const allowedColumns = [
        "network", "network_mode", "title", "description", "contract_hash",
        "method", "params", "unsigned_tx", "signers_required", "status",
        "creator_address", "metadata",
      ];

      for (const col of allowedColumns) {
        if (col === "params") {
          if (sanitizedParams === null || sanitizedParams === undefined) continue;
          columns.push(col);
          values.push(JSON.stringify(sanitizedParams));
          placeholders.push(`$${values.length}`);
          continue;
        }
        if (body[col] !== undefined) {
          columns.push(col);
          values.push(
            col === "metadata" && typeof body[col] === "object"
              ? JSON.stringify(body[col])
              : body[col]
          );
          placeholders.push(`$${values.length}`);
        }
      }

      if (!columns.length) {
        return res.status(400).json({ error: "No valid fields provided." });
      }

      const sql = `INSERT INTO multisig_requests (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
      const { rows } = await _query(sql, values);
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[api/multisig/requests]", err);
    return res.status(500).json({ error: "Internal error processing multisig request." });
  }
};

// Test-only dependency injection (see the seam comment above). Inert in
// production — nothing calls these unless a test does.
module.exports._internal = {
  setDepsForTests(overrides = {}) {
    if (overrides.query) _query = overrides.query;
  },
  resetDepsForTests() {
    _query = query;
  },
};
