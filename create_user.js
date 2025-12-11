import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://sbkthgolctsnwgikzuan.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNia3RoZ29sY3RzbndnaWt6dWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MTAwNjAsImV4cCI6MjA4MDk4NjA2MH0.4_tjCNzDkuLhR0HJIAfok2_-qQsG8CBkFVR6eizs75U'
);

async function createGodUser() {
    console.log("Creating user LEMONsoda...");
    const email = 'LEMONsoda@gmail.com'; // Valid email format required
    const password = 'Xbit_1975';

    // 1. Sign Up
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: 'LEMONsoda God',
                kitCode: 'GOD-MODE-ENABLED',
                role: 'god'
            }
        }
    });

    if (error) {
        console.error("Error signing up:", error.message);
        // If user already exists, we should try to sign in and update
        if (error.message.includes('already registered')) {
            console.log("User exists, trying to sign in to update...");
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (loginError) {
                console.error("Could not sign in:", loginError.message);
                return;
            }
            if (loginData.user) {
                await ensureGodRole(loginData.user.id);
            }
        }
    } else if (data.user) {
        console.log("User created with ID:", data.user.id);
        await ensureGodRole(data.user.id);
    }
}

async function ensureGodRole(userId) {
    // We cannot update 'role' via client API easily if RLS blocks it (which it does, only God can update God).
    // So we will output the SQL command to run, or try to run a script locally with postgres connection like before.
    console.log(`\nIMPORTANT: RUN THIS SQL TO FINALIZE GOD ROLE:\n`);
    console.log(`UPDATE profiles SET role = 'god' WHERE id = '${userId}';`);

    // We can also try to use our 'run_migration' style script to execute this SQL directly.
}

createGodUser();
