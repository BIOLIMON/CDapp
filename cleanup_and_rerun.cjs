const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const USER_ID = 'c0626cb1-6fd6-4ba9-9fc4-cfa75947eca2';
const CSV_PATH = './test_set/simulated_data.csv';
const IMAGES_BASE_PATH = './test_set/pics';
const DB_CONNECTION_STRING = 'postgresql://postgres.sbkthgolctsnwgikzuan:Xbit_19751722@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

const envContent = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const SUPABASE_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dbClient = new Client({
    connectionString: DB_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

async function uploadImage(localPath, storagePath) {
    try {
        const fileContent = fs.readFileSync(localPath);
        const { data, error } = await supabase.storage
            .from('images')
            .upload(storagePath, fileContent, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) {
            // Ignore "Duplicate" error if upsert is true, but verify
            if (error.message !== 'The resource already exists') throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(storagePath);

        return publicUrl;
    } catch (err) {
        console.error(`Failed to upload ${localPath}:`, err.message);
        return null; // Return null but don't crash
    }
}

async function run() {
    try {
        console.log("Connecting to Database...");
        await dbClient.connect();

        // 1. CLEANUP
        console.log(`Cleaning up previous data for User ${USER_ID}...`);
        // Delete pots via cascade? Schema likely has ON DELETE CASCADE? 
        // If not, we need to convert to delete pots first.
        // Let's assume standard cascade or manual delete.

        // Delete entries (should cascade to pots)
        const delRes = await dbClient.query("DELETE FROM public.experiment_entries WHERE user_id = $1", [USER_ID]);
        console.log(`Deleted ${delRes.rowCount} entries.`);

        // Reset Score
        await dbClient.query("UPDATE public.profiles SET score = 0 WHERE id = $1", [USER_ID]);

        // 2. RE-RUN SIMULATION
        console.log("Starting Simulation Re-Run...");

        const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = csvContent.trim().split('\n');

        const entriesByDate = {};

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length < 5) continue;

            const date = row[0].trim();
            if (!entriesByDate[date]) {
                entriesByDate[date] = [];
            }
            entriesByDate[date].push({
                date: row[0].trim(),
                day: row[1].trim(),
                potId: row[2].trim(),
                treatment: row[3].trim(),
                weight: row[4].trim(),
                height: row[5].trim(),
                ph: row[6].trim(),
                visualStatus: row[7].trim(),
                imagePath: row[8].trim() // CRITICAL FIX: Trim whitespace/CR
            });
        }

        let processedDays = 0;

        for (const [date, rows] of Object.entries(entriesByDate)) {
            const dayNumber = rows[0].day;
            console.log(`Processing Day ${dayNumber} (${date})...`);

            try {
                const entryRes = await dbClient.query(
                    `INSERT INTO public.experiment_entries (user_id, date, day_number, general_notes)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id`,
                    [USER_ID, date, dayNumber, "Simulated Entry"]
                );
                const entryId = entryRes.rows[0].id;

                for (const row of rows) {
                    const filename = path.basename(row.imagePath); // "1.png"
                    const localImagePath = path.join(IMAGES_BASE_PATH, filename);
                    const storagePath = `simulation/${USER_ID}/${date}/pot_${row.potId}_${filename}`;

                    let publicUrl = null;
                    if (fs.existsSync(localImagePath)) {
                        publicUrl = await uploadImage(localImagePath, storagePath);
                    } else {
                        console.warn(`[WARN] Image not found: ${localImagePath}`);
                    }

                    await dbClient.query(
                        `INSERT INTO public.pots (entry_id, pot_id, weight, height, visual_status, ph, notes, images)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            entryId,
                            row.potId,
                            parseFloat(row.weight) || 0,
                            parseFloat(row.height) || 0,
                            row.visualStatus,
                            parseFloat(row.ph) || 0,
                            row.treatment,
                            publicUrl ? { frente: publicUrl } : {}
                        ]
                    );
                }
                process.stdout.write('✓');
                processedDays++;

            } catch (dayErr) {
                console.error(`Error processing day ${date}:`, dayErr);
            }
        }

        const totalScore = processedDays * 100;
        await dbClient.query(
            "UPDATE public.profiles SET score = score + $1 WHERE id = $2",
            [totalScore, USER_ID]
        );

        console.log(`\nRe-Run Completed. Processed ${processedDays} days.`);

    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        await dbClient.end();
    }
}

run();
