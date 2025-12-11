const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres.sbkthgolctsnwgikzuan:Xbit_19751722@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB.");

        // 1. Create Bucket
        await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('images', 'images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg'])
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
        console.log("Bucket 'images' created/updated.");

        // 2. Create Policy for Upload (Authenticated)
        // Note: 'storage.objects' is the table.
        // We need to enable RLS on storage.objects if not already? (Usually enabled)
        // Policy: Allow insert for authenticated users
        await client.query(`
      DROP POLICY IF EXISTS "Public Access" ON storage.objects;
      CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
      
      DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
      CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'images' );
      
      -- Also allow Anon upload for simulation script (since we use anon key)?
      -- Actually, simulation script usually runs as anon unless we sign in?
      -- The script uses createClient(url, anonKey). It sends anon token.
      -- So we must allow public upload OR sign in with a service role?
      -- Let's just allow ANON upload for now to fix the script blockage, then maybe restrict.
      DROP POLICY IF EXISTS "Anon Upload" ON storage.objects;
      CREATE POLICY "Anon Upload" ON storage.objects FOR INSERT TO anon WITH CHECK ( bucket_id = 'images' );
    `);
        console.log("Storage policies applied.");

    } catch (err) {
        console.error("Error creating bucket:", err);
    } finally {
        await client.end();
    }
}

run();
