
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

        console.log('\n--- Profiles ---');
        const res = await client.query(`SELECT id, email, role, name FROM profiles`);
        res.rows.forEach(r => console.log(JSON.stringify(r)));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
