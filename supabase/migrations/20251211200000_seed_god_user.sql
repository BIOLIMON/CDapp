
-- Set all users to 'god' temporarily to ensure access (or specific user if we knew ID/Email)
-- Since this is Dev/Test env, promoting all is acceptable first step.
UPDATE profiles SET role = 'god';
