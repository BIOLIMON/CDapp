const { Client } = require('pg');
const fs = require('fs');

// --- CONFIGURATION ---
// Reuse connection string from previous scripts or env
// Using the one found in run_simulation.cjs for consistency in this environment
const DB_CONNECTION_STRING = 'postgresql://postgres.sbkthgolctsnwgikzuan:Xbit_19751722@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

const dbClient = new Client({
    connectionString: DB_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

function calculateScore(entries, pots) {
    let score = 0;

    // 1. Quantity Points
    score += entries.length * 100;

    // 2. Photo Points
    // We iterate pots. A pot belongs to an entry.
    pots.forEach(pot => {
        const img = pot.images || {};
        // Check for recognized keys or just count non-empty values
        // My TS logic checked specific keys: front, top, profile.
        // run_simulation.cjs inserted { frente: url }. 'frente' vs 'front'.
        // The TS code in api.ts checks 'front', 'top', 'profile'.
        // I should probably support Spanish keys too if that's what's in DB.
        // run_simulation uses 'frente'. 
        // Let's support both or just count keys.
        // To be safe and generous, let's count keys that look like urls.

        let photoCount = 0;
        if (img.front || img.frente) photoCount++;
        if (img.top || img.arriba) photoCount++;
        if (img.profile || img.perfil) photoCount++;

        score += photoCount * 50;
    });

    // 3. Consistency/Streak (Simplified)
    if (entries.length > 5) score += 200;
    if (entries.length > 10) score += 500;

    return score;
}

async function run() {
    try {
        console.log("Connecting to Database...");
        await dbClient.connect();

        // 1. Get All Users
        const usersRes = await dbClient.query("SELECT id, email FROM auth.users"); // Or public.profiles? Profiles is where score lives.
        const profilesRes = await dbClient.query("SELECT id FROM public.profiles");
        const profiles = profilesRes.rows;

        console.log(`Found ${profiles.length} profiles.`);

        for (const profile of profiles) {
            const userId = profile.id;

            // 2. Get Entries
            const entriesRes = await dbClient.query("SELECT * FROM public.experiment_entries WHERE user_id = $1", [userId]);
            const entries = entriesRes.rows;

            // 3. Get Pots (for photos)
            // We can fetch all pots for these entries
            const entryIds = entries.map(e => e.id);
            let pots = [];
            if (entryIds.length > 0) {
                // Parameterized query for array
                const potsRes = await dbClient.query("SELECT * FROM public.pots WHERE entry_id = ANY($1::uuid[])", [entryIds]);
                pots = potsRes.rows;
            }

            // 4. Calculate
            const score = calculateScore(entries, pots);
            console.log(`User ${userId.slice(0, 8)}... -> Entries: ${entries.length}, Score: ${score}`);

            // 5. Update
            await dbClient.query("UPDATE public.profiles SET score = $1 WHERE id = $2", [score, userId]);
        }

        console.log("Scores updated.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await dbClient.end();
    }
}

run();
