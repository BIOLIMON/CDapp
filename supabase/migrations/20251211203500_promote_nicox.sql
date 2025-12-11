
-- Promote nicox12353@gmail.com to god
UPDATE profiles 
SET role = 'god' 
WHERE email = 'nicox12353@gmail.com';

-- Ensure they have a kit code bypass if needed, or we assume they have a kit.
-- If they don't have a kit code, they might be blocked by the "Account not configured" check 
-- UNLESS our previous App.tsx change to bypass kit check for 'god' works.
-- It should work because AuthContext fetches the profile, sees 'god', and App.tsx redirects.
-- BUT, if the user is stuck in "Pending Registration" logic because kit_code is null in DB...
-- Let's give them a kit code too just in case to be safe.
UPDATE profiles
SET kit_code = 'GOD-ACCESS-GRANTED'
WHERE email = 'nicox12353@gmail.com' AND (kit_code IS NULL OR kit_code = '');
