const { query } = require("../../lib/db");
const { enforceMultisigMutationPolicy } = require("../../lib/multisigMutations");
const { enforceMutationSameOrigin } = require("../../lib/sameOriginGuard");

function cors(res) {
  // Tightened from `*`: only the explorer's own origins may call this endpoint
  // cross-origin. Same-origin SPA usage is unaffected.
  res.setHeader("Access-Control-Allow-Origin", "https://www.neo3scan.com");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const id = Number(req.query.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid request id." });
  }

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
        WHERE r.id = $1
      `;
      const params = [id];

      if (network) {
        params.push(network);
        sql += ` AND (r.network = $${params.length} OR r.network_mode = $${params.length})`;
      }

      sql += ` GROUP BY r.id`;

      const { rows } = await query(sql, params);
      if (!rows.length) {
        return res.status(404).json({ error: "Request not found." });
      }
      const row = rows[0];
      if (typeof row.signatures === "string") {
        row.signatures = JSON.parse(row.signatures);
      }
      return res.status(200).json(row);
    }

    if (req.method === "PATCH") {
      // Block cross-origin PATCH (CSRF). Without this, any website could
      // overwrite status/broadcast_tx_hash/params/metadata on any multisig
      // request by id. The same-origin explorer SPA always passes this guard.
      if (!enforceMutationSameOrigin(req, res)) {
        return;
      }
      const body = req.body || {};
      if (!enforceMultisigMutationPolicy(req, res, {
        operation: "update-request",
        key: `${id}:${body.status || "status"}`,
      })) {
        return;
      }

      const sets = [];
      const values = [id];

      if (body.status !== undefined) {
        values.push(body.status);
        sets.push(`status = $${values.length}`);
      }
      if (body.broadcast_tx_hash !== undefined) {
        values.push(body.broadcast_tx_hash);
        sets.push(`broadcast_tx_hash = $${values.length}`);
      }
      if (body.broadcast_at !== undefined) {
        values.push(body.broadcast_at);
        sets.push(`broadcast_at = $${values.length}`);
      }
      if (body.params !== undefined) {
        values.push(JSON.stringify(body.params));
        sets.push(`params = $${values.length}`);
      }
      if (body.metadata !== undefined) {
        values.push(JSON.stringify(body.metadata));
        sets.push(`metadata = $${values.length}`);
      }

      if (!sets.length) {
        return res.status(400).json({ error: "No valid fields to update." });
      }

      sets.push("updated_at = now()");
      const sql = `UPDATE multisig_requests SET ${sets.join(", ")} WHERE id = $1 RETURNING *`;
      const { rows } = await query(sql, values);
      if (!rows.length) {
        return res.status(404).json({ error: "Request not found." });
      }
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[api/multisig/requests/[id]]", err);
    return res.status(500).json({ error: "Internal error processing multisig request." });
  }
};
