const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:UZ3yt@7nLcxQKZg@db.xistvcqaiusnhrujnpaz.supabase.co:5432/postgres',
});

async function setup() {
  await client.connect();
  console.log("Connected to Supabase Postgres.");

  try {
    // 1. Multisig Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.multisig_requests (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          creator_address VARCHAR(40) NOT NULL,
          target_contract VARCHAR(42),
          method VARCHAR(255),
          params JSONB,
          description TEXT,
          signers_required INTEGER NOT NULL DEFAULT 1,
          eligible_signers JSONB, -- Array of addresses
          status VARCHAR(50) DEFAULT 'pending', -- pending, executed, cancelled
          network VARCHAR(20) DEFAULT 'mainnet',
          tx_hash VARCHAR(66),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    // 2. Multisig Signatures Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.multisig_signatures (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          request_id UUID REFERENCES public.multisig_requests(id) ON DELETE CASCADE,
          signer_address VARCHAR(40) NOT NULL,
          signature TEXT NOT NULL,
          public_key TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(request_id, signer_address)
      );
    `);

    // Add RLS
    await client.query(`ALTER TABLE public.multisig_requests ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE public.multisig_signatures ENABLE ROW LEVEL SECURITY;`);

    await client.query(`DROP POLICY IF EXISTS "Public can read multisig_requests" ON public.multisig_requests;`);
    await client.query(`DROP POLICY IF EXISTS "Public can insert multisig_requests" ON public.multisig_requests;`);
    await client.query(`DROP POLICY IF EXISTS "Public can update multisig_requests" ON public.multisig_requests;`);
    
    await client.query(`DROP POLICY IF EXISTS "Public can read multisig_signatures" ON public.multisig_signatures;`);
    await client.query(`DROP POLICY IF EXISTS "Public can insert multisig_signatures" ON public.multisig_signatures;`);

    // Open policies for now (in production, we'd use signed payloads to verify the creator)
    await client.query(`CREATE POLICY "Public can read multisig_requests" ON public.multisig_requests FOR SELECT USING (true);`);
    await client.query(`CREATE POLICY "Public can insert multisig_requests" ON public.multisig_requests FOR INSERT WITH CHECK (true);`);
    await client.query(`CREATE POLICY "Public can update multisig_requests" ON public.multisig_requests FOR UPDATE USING (true);`);

    await client.query(`CREATE POLICY "Public can read multisig_signatures" ON public.multisig_signatures FOR SELECT USING (true);`);
    await client.query(`CREATE POLICY "Public can insert multisig_signatures" ON public.multisig_signatures FOR INSERT WITH CHECK (true);`);

    console.log("Multisig schema created successfully.");

  } catch (err) {
    console.error("Error setting up DB:", err);
  } finally {
    await client.end();
  }
}

setup();
