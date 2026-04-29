const { query } = require("../lib/db");
const { enforceMultisigMutationPolicy } = require("../lib/multisigMutations");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const network = String(req.query.network || "").trim() || null;
      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50;
      const rawOffset = Number(req.query.offset);
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;

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

      params.push(limit);
      params.push(offset);
      sql += ` GROUP BY r.id ORDER BY r.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

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
      const body = req.body || {};
      if (!enforceMultisigMutationPolicy(req, res, {
        operation: "create-request",
        key: `${body.network || body.network_mode || "unknown"}:${body.creator_address || "unknown"}`,
      })) {
        return;
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
        if (body[col] !== undefined) {
          columns.push(col);
          values.push(
            (col === "params" || col === "metadata") && typeof body[col] === "object"
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
