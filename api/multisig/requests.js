const { query } = require("../lib/db");
const { enforceMultisigMutationPolicy } = require("../lib/multisigMutations");
const { callWithRpcEndpointFallback, normalizeNetwork } = require("../lib/rpcEndpoints");
const { enforceMutationSameOrigin } = require("../lib/sameOriginGuard");

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

function paramsDeclareCommittee(params) {
  if (!params || typeof params !== "object") return false;
  return COMMITTEE_PARAM_FIELDS.some((field) => params[field] !== undefined);
}

async function resolveCanonicalCommittee(network) {
  const committee = await callWithRpcEndpointFallback(network, async (url) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getcommittee", params: [] }),
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

      const { rows } = await query(sql, params);
      // Parse the JSON-aggregated signatures
      for (const row of rows) {
        if (typeof row.signatures === "string") {
          row.signatures = JSON.parse(row.signatures);
        }
      }
      return res.status(200).json(rows);
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

      // Resolve the canonical committee server-side and overwrite any
      // caller-supplied committee/allowlist fields in params. We never trust
      // the committee set from the request body (it gates signature
      // verification downstream). If the body declares a committee but we
      // cannot resolve the canonical set, reject rather than store an
      // unverifiable (caller-pinned) one.
      const requestNetwork = normalizeNetwork(body.network || body.network_mode);
      const incomingParams =
        body.params && typeof body.params === "object" && !Array.isArray(body.params)
          ? body.params
          : null;

      let resolvedCommittee = null;
      try {
        resolvedCommittee = await resolveCanonicalCommittee(requestNetwork);
      } catch (committeeErr) {
        console.error("[api/multisig/requests] committee resolution failed:", committeeErr);
        if (paramsDeclareCommittee(incomingParams)) {
          return res.status(502).json({
            error: "Unable to resolve the canonical committee server-side; refusing to trust a caller-supplied committee.",
          });
        }
      }

      let sanitizedParams = incomingParams;
      if (resolvedCommittee) {
        sanitizedParams = { ...(incomingParams || {}) };
        // Strip any caller-provided committee aliases, then pin the
        // server-resolved canonical set so downstream verification only ever
        // trusts pubkeys derived here.
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
      const { rows } = await query(sql, values);
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[api/multisig/requests]", err);
    return res.status(500).json({ error: "Internal error processing multisig request." });
  }
};
