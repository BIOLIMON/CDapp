-- Promote User to God Role
-- Replace 'USER_EMAIL_HERE' with the actual email of the user you want to promote.

UPDATE public.profiles
SET role = 'god'
WHERE email = 'nicox12353@gmail.com'; -- Email taken from your screenshot

-- Verify the change
SELECT * FROM public.profiles WHERE email = 'nicox12353@gmail.com';
