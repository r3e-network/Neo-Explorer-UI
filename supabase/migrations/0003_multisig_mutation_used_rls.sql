-- Defense in depth for the server-only multisig mutation replay ledger.
--
-- The Vercel API writes this table through a direct Postgres connection. Browser
-- clients should never read or write replay signatures through the Supabase Data
-- API, so explicitly revoke public client roles and enable RLS if the table
-- lives in an exposed schema.

alter table if exists public.multisig_mutation_used enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.multisig_mutation_used from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table public.multisig_mutation_used from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on table public.multisig_mutation_used to service_role;
  end if;
end $$;
