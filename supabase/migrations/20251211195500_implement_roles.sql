
-- 1. Enforce strict roles on profiles
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS valid_roles;

ALTER TABLE profiles
ADD CONSTRAINT valid_roles CHECK (role IN ('god', 'admin', 'user'));

-- Sets default role to 'user' for new inserts
ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'user';


-- 2. Clean up Policies (Drop all existing to be safe and start clean)
DROP POLICY IF EXISTS "Admins can manage kits" ON allowed_kits;
DROP POLICY IF EXISTS "Admins can manage all kits" ON allowed_kits;
DROP POLICY IF EXISTS "Users can view available kits" ON allowed_kits;
-- Add drops for profiles policies if any existed, though standard is usually 'Users can read own'

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_kits ENABLE ROW LEVEL SECURITY;


-- 3. Define Policies for PROFILES

-- READ: 
-- God/Admin can read ALL profiles.
-- Users can read ONLY their own profile.
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
USING (
  (auth.uid() = id) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin')))
);

-- UPDATE:
-- God: Can update ANY profile.
-- Admin: Can update ONLY 'user' profiles. CANNOT update 'god' or 'admin' profiles.
-- User: Can update OWN profile.
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
USING (
  -- Rule 1: Self update
  (auth.uid() = id) 
  OR
  -- Rule 2: God mode
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god'))
  OR
  -- Rule 3: Admin managing Users (Target profile must be 'user')
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') 
    AND 
    role = 'user' -- The row being updated must be a user
  )
)
WITH CHECK (
  -- Rule 1: Self update (prevent elevating own role)
  ((auth.uid() = id) AND (role = (SELECT role FROM profiles WHERE id = auth.uid())))
  OR
  -- Rule 2: God mode (Can do anything)
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god'))
  OR
  -- Rule 3: Admin managing Users (Can only set role to 'user', effectively cannot promote)
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') 
    AND 
    role = 'user'
  )
);


-- 4. Define Policies for ALLOWED_KITS

-- READ:
-- Everyone can read available kits (needed for registration/claiming)
-- God/Admin can read ALL kits
CREATE POLICY "kits_select_policy" ON allowed_kits
FOR SELECT
USING (
  status = 'available' OR
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin')))
);

-- ALL MODIFICATIONS (Insert/Update/Delete):
-- God/Admin ONLY.
CREATE POLICY "kits_all_manage_policy" ON allowed_kits
FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin'))
);

-- Note: 'Users' do NOT get direct INSERT/UPDATE/DELETE on kits.
-- Claiming a kit is done via specific business logic or specific 'claim' RPC/Policy if we wanted.
-- For now, let's allow Users to UPDATE a kit ONLY if:
-- 1. It is currently available
-- 2. They are setting status to 'claimed' and 'claimed_by' to themselves.
CREATE POLICY "kits_user_claim_policy" ON allowed_kits
FOR UPDATE
USING (
    status = 'available' 
    AND 
    (NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin'))) -- Only if NOT admin/god (they use other policy)
)
WITH CHECK (
    status = 'claimed' AND claimed_by = auth.uid()
);


-- 5. Secure RPC: admin_upload_kits_v2
-- Re-applying with STRICT checks now that policies are strictly defined.

CREATE OR REPLACE FUNCTION admin_upload_kits_v2(
    kits_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    auth_role text;
    inserted_count int;
BEGIN
    -- 1. Strict Role Check
    SELECT role INTO auth_role FROM profiles WHERE id = auth.uid();
    
    IF auth_role IS NULL OR auth_role NOT IN ('god', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: God or Admin role required');
    END IF;

    -- 2. Bulk Upsert
    WITH input_rows AS (
        SELECT 
            (j->>'code') as code,
            (j->>'batch_id') as batch_id,
            (j->>'kit_number') as kit_number,
            (j->>'variety') as variety
        FROM jsonb_array_elements(kits_data) j
    ),
    upserted AS (
        INSERT INTO allowed_kits (code, batch_id, kit_number, variety, status)
        SELECT 
            code, 
            batch_id, 
            kit_number, 
            variety,
            'available'::text
        FROM input_rows
        ON CONFLICT (code) DO UPDATE SET
            batch_id = EXCLUDED.batch_id,
            kit_number = COALESCE(EXCLUDED.kit_number, allowed_kits.kit_number),
            variety = COALESCE(EXCLUDED.variety, allowed_kits.variety)
        RETURNING 1
    )
    SELECT count(*) INTO inserted_count FROM upserted;

    RETURN jsonb_build_object('success', true, 'count', inserted_count);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
