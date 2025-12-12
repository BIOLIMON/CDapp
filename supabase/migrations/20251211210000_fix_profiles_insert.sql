
-- Ensure Users can INSERT their own profile (for Registration / Upsert)
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Ensure user can read their own profile even if role is null (initial state)
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
USING (
  (auth.uid() = id) 
  OR 
  (get_my_role() IN ('god', 'admin'))
);

-- Ensure user can update own profile
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
USING (
  (auth.uid() = id) 
  OR 
  (get_my_role() IN ('god', 'admin'))
)
WITH CHECK (
  (auth.uid() = id) 
  OR 
  (get_my_role() IN ('god', 'admin'))
);
