const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:UZ3yt@7nLcxQKZg@db.xistvcqaiusnhrujnpaz.supabase.co:5432/postgres',
});

async function setup() {
  await client.connect();
  console.log("Connected to Supabase Postgres.");

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.mempool_transactions (
          hash VARCHAR(66) PRIMARY KEY,
          network VARCHAR(20) NOT NULL,
          sender VARCHAR(40),
          size INTEGER,
          netfee BIGINT,
          sysfee BIGINT,
          valid_until_block INTEGER,
          timestamp BIGINT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.network_alerts (
          id SERIAL PRIMARY KEY,
          contact VARCHAR(255) NOT NULL,
          network VARCHAR(20) NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          threshold INTEGER,
          target VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    // Add indexes for quicker lookups
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mempool_network ON public.mempool_transactions (network);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alerts_network ON public.network_alerts (network);`);

    console.log("Mempool and Alerts tables created successfully.");

  } catch (err) {
    console.error("Error setting up DB:", err);
  } finally {
    await client.end();
  }
}

setup();