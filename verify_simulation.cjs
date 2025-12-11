const { Client } = require('pg');

const USER_ID = 'c0626cb1-6fd6-4ba9-9fc4-cfa75947eca2';
const CONNECTION_STRING = 'postgresql://postgres.sbkthgolctsnwgikzuan:Xbit_19751722@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected.");

        // 1. Count Entries
        const entriesRes = await client.query("SELECT count(*) FROM experiment_entries WHERE user_id = $1", [USER_ID]);
        console.log(`Entries Created: ${entriesRes.rows[0].count}`);

        // 2. Count Pots
        const potsRes = await client.query(`
        SELECT count(*) 
        FROM pots p 
        JOIN experiment_entries e ON p.entry_id = e.id 
        WHERE e.user_id = $1
    `, [USER_ID]);
        console.log(`Pots Created: ${potsRes.rows[0].count}`);

        // 3. Check Images
        const imagesRes = await client.query(`
        SELECT count(*) 
        FROM pots p 
        JOIN experiment_entries e ON p.entry_id = e.id 
        WHERE e.user_id = $1 AND (images->>'frente') IS NOT NULL
    `, [USER_ID]);
        console.log(`Pots with Images: ${imagesRes.rows[0].count}`);

        // 4. Check Score
        const profileRes = await client.query("SELECT score FROM profiles WHERE id = $1", [USER_ID]);
        console.log(`User Score: ${profileRes.rows[0].score}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
