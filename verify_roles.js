
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

        // 1. Verify God User Exists
        console.log('\n--- Checking God Users ---');
        const godUsers = await client.query(`SELECT id, email, role FROM profiles WHERE role = 'god'`);
        if (godUsers.rows.length === 0) {
            console.error("FAIL: No God user found.");
        } else {
            console.log(`SUCCESS: Found ${godUsers.rows.length} God users.`);
            godUsers.rows.forEach(u => console.log(`- ${u.email} (${u.role})`));
        }

        // 2. Verify RPC Function Signature
        console.log('\n--- Checking RPC Function ---');
        const rpc = await client.query(`SELECT prosrc FROM pg_proc WHERE proname = 'admin_upload_kits_v2'`);
        if (rpc.rows.length > 0) {
            console.log("SUCCESS: admin_upload_kits_v2 exists.");
            if (rpc.rows[0].prosrc.includes("IF auth_role IS NULL OR auth_role NOT IN ('god', 'admin') THEN")) {
                console.log("SUCCESS: RPC has strict role check.");
            } else {
                console.warn("WARNING: RPC might not have strict role check. Please review source.");
                console.log(rpc.rows[0].prosrc);
            }
        } else {
            console.error("FAIL: admin_upload_kits_v2 NOT found.");
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
