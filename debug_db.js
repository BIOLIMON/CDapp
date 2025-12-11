
import pg from 'pg';
import dns from 'dns';
import util from 'util';

const { Client } = pg;
const lookup = util.promisify(dns.lookup);

const host = 'db.sbkthgolctsnwgikzuan.supabase.co';
const password = 'Xbit_19751722';

async function run() {
    const { address } = await lookup(host, { family: 4 });
    const client = new Client({
        connectionString: `postgresql://postgres:${password}@${address}:5432/postgres`,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Check Table Columns
        console.log('\n--- Columns in allowed_kits ---');
        const resCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'allowed_kits';
    `);
        resCols.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

        // 2. Check RLS Policies
        console.log('\n--- RLS Policies on allowed_kits ---');
        const resPol = await client.query(`
        SELECT policyname, cmd, roles 
        FROM pg_policies 
        WHERE tablename = 'allowed_kits';
    `);
        resPol.rows.forEach(r => console.log(JSON.stringify(r)));

        // 3. Check RPC Function
        console.log('\n--- Function admin_upload_kits ---');
        const resFunc = await client.query(`
        SELECT prosrc 
        FROM pg_proc 
        WHERE proname = 'admin_upload_kits';
    `);
        if (resFunc.rows.length > 0) {
            console.log("Function Definition found.");
            console.log(resFunc.rows[0].prosrc); // Print source
        } else {
            console.log("Function admin_upload_kits NOT FOUND.");
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
