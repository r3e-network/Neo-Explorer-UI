-- Single-use ledger for multisig mutation signatures (replay protection).
--
-- The multisig PATCH endpoint authorizes a state change with a wallet signature
-- over a canonical message. Without a single-use record, a captured valid
-- signature could be replayed indefinitely to re-apply or ROLL BACK proposal
-- state. The signed message now also carries a `Signed At` timestamp; the server
-- rejects stale timestamps (bounded freshness window) and records each accepted
-- signature here so it can never be applied twice.
--
-- Rows older than the freshness window are useless (a stale signature is
-- rejected on freshness alone) and may be pruned; the application prunes
-- opportunistically and an index supports it.

create table if not exists multisig_mutation_used (
  request_id     bigint      not null,
  signature      text        not null,
  signer_address text        not null,
  signed_at      timestamptz not null,
  used_at        timestamptz not null default now(),
  primary key (request_id, signature)
);

create index if not exists multisig_mutation_used_used_at_idx
  on multisig_mutation_used (used_at);
