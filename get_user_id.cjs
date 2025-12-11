const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres.sbkthgolctsnwgikzuan:Xbit_19751722@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        // Fetch User ID and Kit Code
        const res = await client.query("SELECT id, email, kit_code FROM public.profiles WHERE email ILIKE '%nicox12353@gmail.com%'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
