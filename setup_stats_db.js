const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:UZ3yt@7nLcxQKZg@db.xistvcqaiusnhrujnpaz.supabase.co:5432/postgres',
});

async function setup() {
  await client.connect();
  console.log("Connected to Supabase Postgres.");

  try {
    // 1. Daily Stats Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.daily_stats (
          date DATE NOT NULL,
          network VARCHAR(20) DEFAULT 'mainnet',
          tx_count INTEGER DEFAULT 0,
          active_addresses INTEGER DEFAULT 0,
          new_addresses INTEGER DEFAULT 0,
          block_count INTEGER DEFAULT 0,
          token_transfers INTEGER DEFAULT 0,
          contract_invocations INTEGER DEFAULT 0,
          PRIMARY KEY (date, network)
      );
    `);

    // 2. Gas Tracker Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.gas_tracker (
          id SERIAL PRIMARY KEY,
          network VARCHAR(20) DEFAULT 'mainnet',
          average_fee DECIMAL(18,8),
          median_fee DECIMAL(18,8),
          total_gas_burned DECIMAL(28,8),
          total_sys_fee DECIMAL(28,8),
          total_net_fee DECIMAL(28,8),
          recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    // 3. Node Liveness Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.node_liveness (
          public_key VARCHAR(66) NOT NULL,
          network VARCHAR(20) DEFAULT 'mainnet',
          uptime_percentage DECIMAL(5,2),
          blocks_produced INTEGER DEFAULT 0,
          last_seen TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20),
          PRIMARY KEY (public_key, network)
      );
    `);

    // RLS Policies
    await client.query(`ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE public.gas_tracker ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE public.node_liveness ENABLE ROW LEVEL SECURITY;`);

    // Drop old policies just in case
    await client.query(`DROP POLICY IF EXISTS "Public can read daily_stats" ON public.daily_stats;`);
    await client.query(`DROP POLICY IF EXISTS "Public can read gas_tracker" ON public.gas_tracker;`);
    await client.query(`DROP POLICY IF EXISTS "Public can read node_liveness" ON public.node_liveness;`);

    // Anyone can read
    await client.query(`CREATE POLICY "Public can read daily_stats" ON public.daily_stats FOR SELECT USING (true);`);
    await client.query(`CREATE POLICY "Public can read gas_tracker" ON public.gas_tracker FOR SELECT USING (true);`);
    await client.query(`CREATE POLICY "Public can read node_liveness" ON public.node_liveness FOR SELECT USING (true);`);

    console.log("Stats schema created successfully.");

  } catch (err) {
    console.error("Error setting up DB:", err);
  } finally {
    await client.end();
  }
}

setup();
