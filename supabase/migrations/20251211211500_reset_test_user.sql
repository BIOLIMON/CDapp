
-- Reset User n.mulleraguirre@gmail.com
-- 1. Unclaim any kits
UPDATE allowed_kits 
SET status = 'available', claimed_by = NULL, claimed_at = NULL 
WHERE claimed_by IN (
    SELECT id FROM profiles WHERE email = 'n.mulleraguirre@gmail.com'
);

-- 2. Delete Profile
DELETE FROM profiles WHERE email = 'n.mulleraguirre@gmail.com';
