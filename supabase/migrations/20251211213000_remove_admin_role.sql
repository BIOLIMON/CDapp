
-- 1. Update Profiles Check Constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('god', 'user'));

-- 2. Update RLS Policies on 'profiles'

-- Select: God can see all, Users can see own
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT
USING ( (auth.uid() = id) OR (get_my_role() = 'god') );

-- Insert: Users can insert own (created previously) - Keep as is (auth.uid() = id).
-- But we can streamline it.
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy" ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Update: God can update all, User can update own
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE
USING ( (auth.uid() = id) OR (get_my_role() = 'god') )
WITH CHECK ( (auth.uid() = id) OR (get_my_role() = 'god') );


-- 3. Update RLS Policies on 'allowed_kits'

-- Select: All can see available? Or separate? 
-- Previous: "Enable read access for all users" (true). 
-- Actually, we want: God sees all, User sees available (or their own).
-- But let's keep it simple: Everyone can read kits (to see availability).
-- (No change needed to Select if it was TRUE)

-- Insert/Update/Delete on Kits: Only God
DROP POLICY IF EXISTS "kits_admin_all_policy" ON allowed_kits; -- Was for god/admin
CREATE POLICY "kits_god_policy" ON allowed_kits
FOR ALL
USING (get_my_role() = 'god')
WITH CHECK (get_my_role() = 'god');

-- User Claim Policy (Update) - Keep
-- "kits_user_claim_policy" allows update if status available. 
-- Ensure it checks auth.uid(). existing policy likely fine, but relies on 'status=available'.


-- 4. Update 'admin_upload_kits_v2' RPC Function
CREATE OR REPLACE FUNCTION admin_upload_kits_v2(kits_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item jsonb;
    count_processed int := 0;
    auth_role text;
BEGIN
    -- Check permissions: Only GOD can upload
    -- (We use get_my_role() or check profiles table directly)
    SELECT role INTO auth_role FROM profiles WHERE id = auth.uid();
    
    IF auth_role IS NULL OR auth_role != 'god' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: God role required');
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(kits_data)
    LOOP
        -- Check if code exists to update or insert? 
        -- Standard Upsert on 'code'
        INSERT INTO allowed_kits (code, batch_id, kit_number, variety, status)
        VALUES (
            (item->>'code'),
            (item->>'batch_id'),
            (item->>'kit_number'),
            (item->>'variety'),
            'available'
        )
        ON CONFLICT (code) DO UPDATE SET
            batch_id = EXCLUDED.batch_id,
            kit_number = EXCLUDED.kit_number,
            variety = EXCLUDED.variety;
            
        count_processed := count_processed + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'count', count_processed);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
