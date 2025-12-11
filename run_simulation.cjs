const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const USER_ID = 'c0626cb1-6fd6-4ba9-9fc4-cfa75947eca2'; // nicox12353@gmail.com
const CSV_PATH = './test_set/simulated_data.csv';
const IMAGES_BASE_PATH = './test_set/pics'; // Actual location
const DB_CONNECTION_STRING = 'postgresql://postgres.sbkthgolctsnwgikzuan:Xbit_19751722@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

// Load Supabase Client for Storage
// We need to read .env.local manually or hardcode strictly for this script.
// Since I can't easily read .env.local with dotenv (not installed), I'll read the file directly.
const envContent = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const SUPABASE_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Could not parse Supabase credentials from .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dbClient = new Client({
    connectionString: DB_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

// --- HELPERS ---
async function uploadImage(localPath, storagePath) {
    try {
        const fileContent = fs.readFileSync(localPath);
        const { data, error } = await supabase.storage
            .from('images')
            .upload(storagePath, fileContent, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(storagePath);

        return publicUrl;
    } catch (err) {
        console.error(`Failed to upload ${localPath}:`, err.message);
        return null;
    }
}

async function run() {
    try {
        console.log("Connecting to Database...");
        await dbClient.connect();
        console.log("Connected.");

        // Read CSV
        const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',');

        // Group by Date
        const entriesByDate = {}; // { '2025-01-01': [row1, row2, row3, row4] }

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(','); // Simple split, assuming no commas in values
            if (row.length < 5) continue;

            const date = row[0];
            if (!entriesByDate[date]) {
                entriesByDate[date] = [];
            }
            entriesByDate[date].push({
                date: row[0],
                day: row[1],
                potId: row[2],
                treatment: row[3],
                weight: row[4],
                height: row[5],
                ph: row[6],
                visualStatus: row[7],
                imagePath: row[8]
            });
        }

        console.log(`Found ${Object.keys(entriesByDate).length} days of data to simulate.`);

        let processedDays = 0;

        for (const [date, rows] of Object.entries(entriesByDate)) {
            const dayNumber = rows[0].day;
            console.log(`Processing Day ${dayNumber} (${date})...`);

            try {
                // 1. Insert Entry
                const entryRes = await dbClient.query(
                    `INSERT INTO public.experiment_entries (user_id, date, day_number, general_notes)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id`,
                    [USER_ID, date, dayNumber, "Simulated Entry"]
                );
                const entryId = entryRes.rows[0].id;

                // 2. Process Pots
                for (const row of rows) {
                    // Map Image Path: "test_set/Frente/1.png" -> "test_set/pics/1.png"
                    // Extract filename
                    const filename = path.basename(row.imagePath); // "1.png"
                    const localImagePath = path.join(IMAGES_BASE_PATH, filename);

                    // Supabase Storage Path
                    const storagePath = `simulation/${USER_ID}/${date}/pot_${row.potId}_${filename}`;

                    // Upload
                    let publicUrl = null;
                    if (fs.existsSync(localImagePath)) {
                        publicUrl = await uploadImage(localImagePath, storagePath);
                    } else {
                        console.warn(`Image not found locally: ${localImagePath}`);
                    }

                    // Insert Pot
                    await dbClient.query(
                        `INSERT INTO public.pots (entry_id, pot_id, weight, height, visual_status, ph, notes, images)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            entryId,
                            row.potId, // "1", "2"...
                            parseFloat(row.weight) || 0,
                            parseFloat(row.height) || 0,
                            row.visualStatus,
                            parseFloat(row.ph) || 0,
                            row.treatment, // Notes = Treatment
                            publicUrl ? { frente: publicUrl } : {} // JSONB images
                        ]
                    );
                }
                process.stdout.write('✓');
                processedDays++;

            } catch (dayErr) {
                console.error(`Error processing day ${date}:`, dayErr);
            }
        }

        // Update User Score
        // Simple logic: 100 pts per entry
        const totalScore = processedDays * 100;
        await dbClient.query(
            "UPDATE public.profiles SET score = score + $1 WHERE id = $2",
            [totalScore, USER_ID]
        );

        console.log(`\nSimulation Completed. Processed ${processedDays} days.`);

    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        await dbClient.end();
    }
}

run();
