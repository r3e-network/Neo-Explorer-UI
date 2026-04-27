const { query } = require("../lib/db");
const { verifyGovernanceWitness } = require("../lib/governanceSignature");
const { enforceMultisigMutationPolicy } = require("../lib/multisigMutations");

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
    if (!signature || signature.length < 128) {
      return res.status(400).json({ error: "Valid signature is required (at least 128 hex chars)." });
    }
    if (!enforceMultisigMutationPolicy(req, res, {
      operation: "add-signature",
      key: `${requestId}:${signerAddress}`,
    })) {
      return;
    }

    const { rows: requestRows } = await query(
      `SELECT * FROM multisig_requests WHERE id = $1 LIMIT 1`,
      [requestId]
    );
    if (!requestRows.length) {
      return res.status(404).json({ error: "Request not found." });
    }

    const verifiedWitness = await verifyGovernanceWitness({
      requestRow: requestRows[0],
      signerAddress,
      publicKey: body.public_key,
      signature,
      invocationScript: body.invocation_script,
      verificationScript: body.verification_script,
    });

    // Check for existing signature from this signer
    const { rows: existing } = await query(
      `SELECT id FROM multisig_signatures WHERE request_id = $1 AND signer_address = $2 LIMIT 1`,
      [requestId, verifiedWitness.signerAddress]
    );

    const allowOverwrite = body.overwrite === true;
    if (existing.length > 0 && !allowOverwrite) {
      return res.status(409).json({ error: "Signature from this signer already exists for this request." });
    }

    // Delete old signature if overwriting
    if (existing.length > 0 && allowOverwrite) {
      await query(`DELETE FROM multisig_signatures WHERE request_id = $1 AND signer_address = $2`, [requestId, verifiedWitness.signerAddress]);
    }

    // Insert signature
    const columns = ["request_id", "signer_address", "signature"];
    const values = [requestId, verifiedWitness.signerAddress, verifiedWitness.signature];

    if (verifiedWitness.publicKey) {
      columns.push("public_key");
      values.push(verifiedWitness.publicKey);
    }
    const normalizedWitness =
      body.witness && typeof body.witness === "object"
        ? {
            ...body.witness,
            signer_address: verifiedWitness.signerAddress,
            signature: verifiedWitness.signature,
            ...(verifiedWitness.publicKey ? { public_key: verifiedWitness.publicKey } : {}),
            ...(verifiedWitness.invocationScript ? { invocation_script: verifiedWitness.invocationScript } : {}),
            ...(verifiedWitness.verificationScript ? { verification_script: verifiedWitness.verificationScript } : {}),
          }
        : null;
    if (normalizedWitness) {
      columns.push("witness");
      values.push(JSON.stringify(normalizedWitness));
    }
    if (verifiedWitness.invocationScript) {
      columns.push("invocation_script");
      values.push(verifiedWitness.invocationScript);
    }
    if (verifiedWitness.verificationScript) {
      columns.push("verification_script");
      values.push(verifiedWitness.verificationScript);
    }
    if (body.metadata && typeof body.metadata === "object") {
      columns.push("metadata");
      values.push(JSON.stringify(body.metadata));
    }

    const placeholders = values.map((_, i) => `$${i + 1}`);
    const sql = `INSERT INTO multisig_signatures (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    const { rows } = await query(sql, values);

    // Also merge signature metadata into the request params (for witness hydration)
    if (verifiedWitness.publicKey || verifiedWitness.invocationScript || normalizedWitness) {
      try {
        const currentParams = requestRows[0]?.params || {};
        const sigMeta = currentParams.signature_metadata || {};
        sigMeta[verifiedWitness.signerAddress] = {
          ...(sigMeta[verifiedWitness.signerAddress] || {}),
          ...(verifiedWitness.publicKey ? { public_key: verifiedWitness.publicKey } : {}),
          ...(verifiedWitness.invocationScript ? { invocation_script: verifiedWitness.invocationScript } : {}),
          ...(verifiedWitness.verificationScript ? { verification_script: verifiedWitness.verificationScript } : {}),
          ...(normalizedWitness ? { witness: normalizedWitness } : {}),
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
    const message = String(err?.message || "Unknown error");
    const isClientError = /required|does not match|not part of the committee|request is missing|failed to resolve|valid signature|not found|verification script|invocation script/i.test(
      message
    );
    return res.status(isClientError ? 400 : 500).json({ error: message });
  }
};
