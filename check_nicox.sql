
-- Check exact profile details for nicox12353@gmail.com
-- Also list all profiles to see if there's a slight variation or multiple users.
SELECT id, email, role, kit_code, name FROM profiles WHERE email ILIKE '%nicox12353%';
