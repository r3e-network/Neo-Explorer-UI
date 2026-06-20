-- Enforce one signature per (request_id, signer_address) on multisig_signatures.
--
-- The signature submission endpoint (api/multisig/signatures.js) used a
-- check-then-insert (SELECT existing -> conditional DELETE -> INSERT), which
-- races under concurrent submissions from the same signer and can persist
-- duplicate signature rows. The application now also catches unique violations,
-- but the DB constraint is the actual race-safety guarantee.
--
-- Safe to run repeatedly: it de-duplicates first, then adds the constraint only
-- if it is not already present.

BEGIN;

-- 1. Collapse any existing duplicates, keeping the most recent row per
--    (request_id, signer_address).
DELETE FROM multisig_signatures s
USING multisig_signatures dup
WHERE s.request_id = dup.request_id
  AND s.signer_address = dup.signer_address
  AND s.id < dup.id;

-- 2. Add the unique constraint if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'multisig_signatures_request_signer_uniq'
  ) THEN
    ALTER TABLE multisig_signatures
      ADD CONSTRAINT multisig_signatures_request_signer_uniq
      UNIQUE (request_id, signer_address);
  END IF;
END
$$;

COMMIT;
