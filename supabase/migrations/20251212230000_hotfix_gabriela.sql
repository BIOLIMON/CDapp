
-- Hotfix: Assign Kit to Gabriela (One-off migration)
DO $$
DECLARE
    target_user_id UUID;
    available_kit_code TEXT;
BEGIN
    -- 1. Find User Gabriela
    SELECT id INTO target_user_id FROM profiles WHERE name ILIKE '%gabriela%' LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        -- 2. Check if she needs a kit
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id AND kit_code IS NOT NULL AND kit_code != '') THEN
            
            -- 3. Find Available Kit
            SELECT code INTO available_kit_code FROM allowed_kits WHERE status = 'available' ORDER BY id ASC LIMIT 1;
            
            IF available_kit_code IS NOT NULL THEN
                -- 4. Assign Kit
                UPDATE allowed_kits SET status = 'claimed', claimed_by = target_user_id, claimed_at = NOW() WHERE code = available_kit_code;
                UPDATE profiles SET kit_code = available_kit_code WHERE id = target_user_id;
                
                RAISE NOTICE 'FIX APPLIED: Assigned Kit % to User %', available_kit_code, target_user_id;
            ELSE
                RAISE NOTICE 'FIX FAILED: No available kits';
            END IF;
        ELSE
             RAISE NOTICE 'User already has a kit or skip';
        END IF;
    ELSE
        RAISE NOTICE 'User Gabriela not found';
    END IF;
END $$;
