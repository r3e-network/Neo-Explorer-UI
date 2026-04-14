const { query } = require("../lib/db");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = req.body || {};
    const requestId = Number(body.request_id);
    const signerAddress = String(body.signer_address || "").trim();
    const signature = String(body.signature || "").trim();

    if (!Number.isFinite(requestId) || requestId <= 0) {
      return res.status(400).json({ error: "Valid request_id is required." });
    }
    if (!signerAddress) {
      return res.status(400).json({ error: "signer_address is required." });
    }
    if (!signature || signature.length < 128) {
      return res.status(400).json({ error: "Valid signature is required (at least 128 hex chars)." });
    }

    // Duplicate check
    const { rows: existing } = await query(
      `SELECT id FROM multisig_signatures WHERE request_id = $1 AND signer_address = $2 LIMIT 1`,
      [requestId, signerAddress]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Signature from this signer already exists for this request." });
    }

    // Insert signature
    const columns = ["request_id", "signer_address", "signature"];
    const values = [requestId, signerAddress, signature];

    if (body.public_key) {
      columns.push("public_key");
      values.push(body.public_key);
    }
    if (body.witness && typeof body.witness === "object") {
      columns.push("witness");
      values.push(JSON.stringify(body.witness));
    }
    if (body.invocation_script) {
      columns.push("invocation_script");
      values.push(body.invocation_script);
    }
    if (body.verification_script) {
      columns.push("verification_script");
      values.push(body.verification_script);
    }
    if (body.metadata && typeof body.metadata === "object") {
      columns.push("metadata");
      values.push(JSON.stringify(body.metadata));
    }

    const placeholders = values.map((_, i) => `$${i + 1}`);
    const sql = `INSERT INTO multisig_signatures (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    const { rows } = await query(sql, values);

    // Also merge signature metadata into the request params (for witness hydration)
    if (body.public_key || body.invocation_script || body.witness) {
      try {
        const { rows: reqRows } = await query(
          `SELECT params FROM multisig_requests WHERE id = $1`,
          [requestId]
        );
        const currentParams = reqRows[0]?.params || {};
        const sigMeta = currentParams.signature_metadata || {};
        sigMeta[signerAddress] = {
          ...(sigMeta[signerAddress] || {}),
          ...(body.public_key ? { public_key: body.public_key } : {}),
          ...(body.invocation_script ? { invocation_script: body.invocation_script } : {}),
          ...(body.witness ? { witness: body.witness } : {}),
        };
        await query(
          `UPDATE multisig_requests SET params = $2, updated_at = now() WHERE id = $1`,
          [requestId, JSON.stringify({ ...currentParams, signature_metadata: sigMeta })]
        );
      } catch (metaErr) {
        console.error("[api/multisig/signatures] Failed to update signature_metadata:", metaErr.message);
      }
    }

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("[api/multisig/signatures]", err);
    return res.status(500).json({ error: err.message });
  }
};
