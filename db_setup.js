const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:UZ3yt@7nLcxQKZg@db.xistvcqaiusnhrujnpaz.supabase.co:5432/postgres',
});

async function setup() {
  await client.connect();
  console.log("Connected to Supabase Postgres.");

  try {
    // 1. Contract Metadata Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.contract_metadata (
          contract_hash VARCHAR(42) PRIMARY KEY,
          name VARCHAR(255),
          symbol VARCHAR(50),
          description TEXT,
          logo_url TEXT,
          website TEXT,
          twitter TEXT,
          is_verified BOOLEAN DEFAULT false,
          abi JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    // 2. Address Tags Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.address_tags (
          address VARCHAR(40) PRIMARY KEY,
          label VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    // 3. User Watchlist (For future auth integration)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.watchlists (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID, -- Would reference auth.users(id) in a full setup
          address VARCHAR(40) NOT NULL,
          tag_name VARCHAR(255),
          notification_enabled BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    
    // Enable Row Level Security (RLS) and create policies for public read access
    await client.query(`ALTER TABLE public.contract_metadata ENABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE public.address_tags ENABLE ROW LEVEL SECURITY;`);
    
    // Drop existing policies if any to avoid errors on rerun
    await client.query(`DROP POLICY IF EXISTS "Public can read contract metadata" ON public.contract_metadata;`);
    await client.query(`DROP POLICY IF EXISTS "Public can read address tags" ON public.address_tags;`);

    // Create new policies
    await client.query(`
        CREATE POLICY "Public can read contract metadata" 
        ON public.contract_metadata FOR SELECT USING (true);
    `);
    
    await client.query(`
        CREATE POLICY "Public can read address tags" 
        ON public.address_tags FOR SELECT USING (true);
    `);

    console.log("Schema created successfully with RLS policies.");

    // Seed some initial data for testing
    await client.query(`
        INSERT INTO public.contract_metadata (contract_hash, name, symbol, website, logo_url, is_verified)
        VALUES 
        ('0xf0151f528127558851b39c2cd8aa47da7418ab28', 'Flamingo', 'FLM', 'https://flamingo.finance', 'https://flamingo.finance/img/FLM.png', true),
        ('0x48c40d4666f93408be1bef038b6722404d9a4c2a', 'bNEO', 'bNEO', 'https://neoburger.io', 'https://app.neoburger.io/favicon.ico', true)
        ON CONFLICT (contract_hash) DO NOTHING;
    `);

    await client.query(`
        INSERT INTO public.address_tags (address, label, category)
        VALUES 
        ('NP2fM6AAN3mS6qA3oFk3TWeCgDMMmHrtfT', 'Binance Hot Wallet 1', 'Exchange'),
        ('NRe8bN2qF2y6w2R7M8y2k7eH7x7F8h5C8z', 'KuCoin Deposit', 'Exchange')
        ON CONFLICT (address) DO NOTHING;
    `);

    console.log("Seed data inserted.");

  } catch (err) {
    console.error("Error setting up DB:", err);
  } finally {
    await client.end();
  }
}

setup();
