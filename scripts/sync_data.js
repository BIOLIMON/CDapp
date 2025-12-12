
import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://sbkthgolctsnwgikzuan.supabase.co';
// Prod Key from Step 407
const PROD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNia3RoZ29sY3RzbndnaWt6dWFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQxMDA2MCwiZXhwIjoyMDgwOTg2MDYwfQ.VU4gxnobB8MPdRWqJfrqIGMSWNCZrSvU6xqI0-EnjFU";

const DEV_URL = 'https://rvsagwmxpqijtprnsurv.supabase.co';
// Dev Key from Step 427
const DEV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2c2Fnd214cHFpanRwcm5zdXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTU3MzkxMiwiZXhwIjoyMDgxMTQ5OTEyfQ.i56YnthXPn7tiskUj3nYecj30dQCeOSIoU6pOaaW6B0";

if (!PROD_KEY || !DEV_KEY) {
    console.error("Missing Keys");
    process.exit(1);
}

const source = createClient(PROD_URL, PROD_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const dest = createClient(DEV_URL, DEV_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function sync() {
    console.log('--- Starting Sync (Force ID Match) ---');

    // 1. Fetch Source Data
    console.log('Fetching Users from Prod...');
    const { data: { users }, error: usersError } = await source.auth.admin.listUsers();
    if (usersError) throw usersError;
    console.log(`Found ${users.length} users in Prod.`);

    console.log('Fetching Profiles...');
    const { data: profiles, error: profError } = await source.from('profiles').select('*');
    if (profError) throw profError;

    console.log('Fetching Kits...');
    const { data: kits, error: kitsError } = await source.from('allowed_kits').select('*');
    if (kitsError) throw kitsError;

    console.log('Fetching Entries...');
    const { data: entries, error: entError } = await source.from('experiment_entries').select('*');
    if (entError) throw entError;

    // 2. Dest: Sync Users
    console.log('Syncing Users to Dev...');

    // Cache existing Dev users to check for conflicts
    const { data: { users: devUsers }, error: devUsersError } = await dest.auth.admin.listUsers();
    if (devUsersError) throw devUsersError;
    const devUserMap = new Map(devUsers.map(u => [u.email, u]));

    for (const u of users) {
        try {
            const existing = devUserMap.get(u.email);

            if (existing) {
                if (existing.id === u.id) {
                    // IDs match, all good.
                    // console.log(`User ${u.email} matches.`);
                } else {
                    console.log(`User ${u.email} exists but ID mismatch (${existing.id} vs ${u.id}). Deleting Dev user...`);
                    // Delete conflicting user
                    const { error: delError } = await dest.auth.admin.deleteUser(existing.id);
                    if (delError) {
                        console.error(`Failed to delete conflicting user ${u.email}:`, delError.message);
                        continue; // Can't proceed if we can't delete
                    }

                    // Recreate with correct ID
                    console.log(`Recreating user ${u.email} with correct ID...`);
                    const { error: createError } = await dest.auth.admin.createUser({
                        email: u.email,
                        email_confirm: u.email_confirmed_at ? true : false,
                        user_metadata: u.user_metadata,
                        password: 'tempPassword123!',
                        id: u.id
                    });
                    if (createError) console.error(`Failed to recreate ${u.email}:`, createError.message);
                }
            } else {
                console.log(`Creating user ${u.email}...`);
                const { error: createError } = await dest.auth.admin.createUser({
                    email: u.email,
                    email_confirm: u.email_confirmed_at ? true : false,
                    user_metadata: u.user_metadata,
                    password: 'tempPassword123!',
                    id: u.id
                });
                if (createError) console.error(`Failed to create ${u.email}:`, createError.message);
            }
        } catch (e) {
            console.error(`Error processing user ${u.email}:`, e.message);
        }
    }

    // 3. Dest: Sync Profiles
    console.log('Syncing Profiles...');
    if (profiles.length) {
        // Profiles depend on User IDs, which we ensured match.
        const { error } = await dest.from('profiles').upsert(profiles);
        if (error) console.error('Error syncing profiles:', error);
    }

    // 4. Dest: Sync Kits
    // REMOVE 'id' from kits to avoid UUID vs BigInt conflict. Let Dev DB assign new IDs or none.
    // Actually, 'allowed_kits' has 'code' as UNIQUE code.
    console.log('Syncing Kits...');
    if (kits.length) {
        const cleanKits = kits.map(k => {
            const { id, ...rest } = k; // Remove ID
            return rest;
        });

        const { error } = await dest.from('allowed_kits').upsert(cleanKits, { onConflict: 'code' });
        if (error) console.error('Error syncing kits:', error);
    }

    // 5. Dest: Sync Entries
    console.log('Syncing Entries...');
    if (entries.length) {
        // Entries depend on User IDs.
        const { error } = await dest.from('experiment_entries').upsert(entries);
        if (error) console.error('Error syncing entries:', error);
    }

    console.log('--- Sync Completed ---');
}

sync().catch(e => console.error(e));
