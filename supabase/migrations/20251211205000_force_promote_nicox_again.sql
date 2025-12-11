
-- Force update with lower case email check just in case
UPDATE profiles 
SET role = 'god', kit_code = 'GOD-ACCESS-GRANTED'
WHERE email = 'nicox12353@gmail.com';

-- Also try case insensitive
UPDATE profiles 
SET role = 'god', kit_code = 'GOD-ACCESS-GRANTED'
WHERE lower(email) = 'nicox12353@gmail.com';
