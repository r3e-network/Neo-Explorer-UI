-- Schema-as-code for the existing live mempool_transactions table.
--
-- This table already exists in production (created ad hoc, outside of any
-- migration), so until now fresh environments and reviewers had no
-- source-of-truth for its shape. This migration codifies it with
-- create-if-not-exists semantics: applying it against the live database is a
-- no-op and therefore safe; applying it to a fresh database produces the
-- shape the api/ code depends on.
--
-- Every column below is derived from the read/write sites in api/:
--   api/sync_mempool.js   upsert rows of { hash, network, sender, size,
--                         netfee, sysfee, valid_until_block, timestamp
--                         (Date.now() epoch ms), status: 'pending' } with
--                         onConflict: 'hash'
--   api/sync_mempool.js   select hash where network = ..; delete where
--                         network = .. and hash in (..); delete where
--                         network = .. and valid_until_block < blockcount
--   api/mempool.js        select * where network = .. order by timestamp desc
--   tests/pages.test.js   the live-deployment integration suite orders the
--                         REST endpoint by first_seen_at, so the live table
--                         also carries that (server-defaulted) column.
--
-- IMPORTANT: sync_mempool.js upserts with onConflict: 'hash'. PostgREST
-- resolves that conflict target against a unique constraint on (hash) ALONE,
-- which the primary key below provides. Do not "improve" this to
-- unique (network, hash) — the upsert's conflict target would no longer
-- match and the cron would start failing.
--
-- The code never reads a surrogate id column, so none is codified; if the
-- live table happens to carry one, create-if-not-exists leaves it untouched.

create table if not exists mempool_transactions (
  hash              text        primary key,
  network           text        not null,
  sender            text        default '',
  size              bigint      default 0,
  netfee            bigint      default 0,
  sysfee            bigint      default 0,
  valid_until_block bigint      default 0,
  "timestamp"       bigint      default 0,
  status            text        default 'pending',
  first_seen_at     timestamptz not null default now()
);
