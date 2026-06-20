const { query } = require("../../lib/db");
const { enforceMultisigMutationPolicy } = require("../../lib/multisigMutations");
const { enforceMutationSameOrigin } = require("../../lib/sameOriginGuard");
const { resolveCommitteePubkeys } = require("../../lib/governanceSignature");
const {
  buildMultisigMutationMessage,
  verifyMultisigMutationAuthorization,
} = require("../../lib/multisigMutationAuth");

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

      // Authorization: only a member of the proposal's committee (or its
      // creator) may mutate its state. Same-origin blocks CSRF, but it does
      // not prove the caller controls `signer_address`; require a Neo message
      // signature over the exact mutation payload before writing state.
      const signerAddress = String(body.signer_address || "").trim();
      if (!signerAddress) {
        return res.status(401).json({
          error: "signer_address is required to mutate a multisig request.",
        });
      }
      const currentRow = await query(
        `SELECT id, creator_address, network, network_mode, params FROM multisig_requests WHERE id = $1`,
        [id],
      );
      const proposal = currentRow.rows[0];
      if (!proposal) {
        return res.status(404).json({ error: "Request not found." });
      }

      // `params` (which holds committee_pubkeys + unsigned_tx) and `unsigned_tx`
      // define the proposal's identity and are the inputs governanceSignature.js
      // trusts to derive the canonical committee. They are immutable after
      // creation. Reject rather than silently ignore so a mistaken/malicious
      // caller gets a clear error.
      if (body.params !== undefined || body.unsigned_tx !== undefined || body.creator_address !== undefined) {
        return res.status(400).json({
          error: "params, unsigned_tx and creator_address are immutable after creation.",
        });
      }

      const sets = [];
      const values = [id];
      let statusValue = null;
      let txHashValue = null;
      let broadcastAtValue = null;
      let metadataValue = undefined;

      if (body.status !== undefined) {
        const status = String(body.status).trim();
        if (!/^[a-z0-9_-]{1,32}$/i.test(status)) {
          return res.status(400).json({ error: "Invalid status value." });
        }
        statusValue = status;
        values.push(statusValue);
        sets.push(`status = $${values.length}`);
      }
      if (body.broadcast_tx_hash !== undefined && body.broadcast_tx_hash !== null) {
        const txHash = String(body.broadcast_tx_hash).trim();
        if (!/^0x[0-9a-f]{64}$/i.test(txHash)) {
          return res.status(400).json({ error: "broadcast_tx_hash must be a 0x-prefixed 32-byte hex hash." });
        }
        txHashValue = txHash;
        values.push(txHashValue);
        sets.push(`broadcast_tx_hash = $${values.length}`);
      }
      if (body.broadcast_at !== undefined && body.broadcast_at !== null) {
        const ts = new Date(body.broadcast_at);
        if (Number.isNaN(ts.getTime())) {
          return res.status(400).json({ error: "broadcast_at must be a valid timestamp." });
        }
        broadcastAtValue = ts.toISOString();
        values.push(broadcastAtValue);
        sets.push(`broadcast_at = $${values.length}`);
      }
      if (body.metadata !== undefined) {
        metadataValue = body.metadata ?? {};
        const metadataJson = JSON.stringify(metadataValue);
        // Bound the size so metadata cannot be used as unbounded storage.
        if (metadataJson.length > 8192) {
          return res.status(400).json({ error: "metadata is too large (max 8KB)." });
        }
        values.push(metadataJson);
        sets.push(`metadata = $${values.length}`);
      }

      if (!sets.length) {
        return res.status(400).json({ error: "No valid fields to update." });
      }

      const mutationMessage = buildMultisigMutationMessage({
        requestId: id,
        network: proposal.network || proposal.network_mode || "",
        status: statusValue || "",
        broadcastTxHash: txHashValue || "",
        broadcastAt: broadcastAtValue || "",
        metadata: metadataValue,
      });

      try {
        await verifyMultisigMutationAuthorization({
          signerAddress,
          publicKey: body.mutation_public_key || body.public_key,
          signature: body.mutation_signature || body.signature,
          message: mutationMessage,
          committeePubkeys: resolveCommitteePubkeys(proposal),
          creatorAddress: proposal.creator_address,
        });
      } catch (authErr) {
        const message = authErr?.message || "Signer is not authorized to mutate this proposal.";
        const statusCode = /required|missing/i.test(message) ? 401 : 403;
        return res.status(statusCode).json({ error: message });
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
