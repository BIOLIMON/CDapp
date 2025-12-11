-- 1. Check for Orphan Users (Auth exists, Profile missing)
SELECT 'Orphan Users' as issue_type, count(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 2. Check for Incomplete Profiles (Profile exists, Kit Code missing)
SELECT 'Incomplete Profiles' as issue_type, count(*) as count
FROM public.profiles
WHERE kit_code IS NULL OR kit_code = '';

-- 3. Check for Orphan Kits (Claimed but User ID invalid)
SELECT 'Orphan Kits' as issue_type, count(*) as count
FROM public.allowed_kits k
LEFT JOIN auth.users u ON k.claimed_by = u.id
WHERE k.status = 'claimed' AND u.id IS NULL;

-- 4. Check for Mismatched Kit Status (Claimed_by set but status available, or vice versa)
SELECT 'Inconsistent Kit Status' as issue_type, count(*) as count
FROM public.allowed_kits
WHERE (status = 'claimed' AND claimed_by IS NULL)
   OR (status = 'available' AND claimed_by IS NOT NULL);

-- LISTING DETAILS (run these if counts > 0)
-- SELECT * FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE p.id IS NULL;
-- SELECT * FROM public.profiles WHERE kit_code IS NULL;
