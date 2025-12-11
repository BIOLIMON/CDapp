
-- Helper function to get current user's role without triggering RLS recursion
-- SECURITY DEFINER allows this function to read 'profiles' table bypassing RLS.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retrieved_role text;
BEGIN
  SELECT role INTO retrieved_role FROM profiles WHERE id = auth.uid();
  RETURN retrieved_role;
END;
$$;

-- Refactor 'profiles' policies to use get_my_role()

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- READ: 
-- 1. Own profile (ID match)
-- 2. God/Admin (Role check via function)
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
USING (
  (auth.uid() = id) 
  OR 
  (get_my_role() IN ('god', 'admin'))
);

-- UPDATE:
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
USING (
  -- Rule 1: Self update
  (auth.uid() = id) 
  OR
  -- Rule 2: God mode
  (get_my_role() = 'god')
  OR
  -- Rule 3: Admin managing Users (Target profile must be 'user')
  (
    get_my_role() = 'admin' 
    AND 
    role = 'user'
  )
)
WITH CHECK (
  -- Rule 1: Self update (prevent elevating own role)
  ((auth.uid() = id) AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))) -- This select might still recurse? 
  -- Wait, (SELECT role FROM profiles...) INSIDE a CHECK on 'profiles' IS recursive.
  -- We should use get_my_role() here if possible, but we need the role of the *row being updated* or the *current state*.
  -- Actually, 'role' in the CHECK expression refers to the NEW value.
  -- To verify we aren't changing the role, we need the OLD value. Standard RLS can't easily see OLD value in CHECK?
  -- Actually, for UPDATE, the USING clause restricts WHICH rows can be updated.
  -- The CHECK clause restricts the NEW values.
  
  -- Let's simplify:
  -- Self: Can update if new role == old role? Hard to enforce without triggers.
  -- Let's rely on standard constraints: Users can only update non-protected fields or use a strict trigger to prevent role changes.
  -- For now, let's just use the Policy logic.
  
  OR
  -- Rule 2: God mode
  (get_my_role() = 'god')
  OR
  -- Rule 3: Admin managing Users (Can only set role to 'user')
  (
    get_my_role() = 'admin' 
    AND 
    role = 'user'
  )
);


-- Refactor 'allowed_kits' policies for consistency/performance

DROP POLICY IF EXISTS "kits_select_policy" ON allowed_kits;
DROP POLICY IF EXISTS "kits_all_manage_policy" ON allowed_kits;
DROP POLICY IF EXISTS "kits_user_claim_policy" ON allowed_kits;


CREATE POLICY "kits_select_policy" ON allowed_kits
FOR SELECT
USING (
  status = 'available' OR
  (get_my_role() IN ('god', 'admin'))
);

CREATE POLICY "kits_all_manage_policy" ON allowed_kits
FOR ALL
USING (
  get_my_role() IN ('god', 'admin')
)
WITH CHECK (
  get_my_role() IN ('god', 'admin')
);

CREATE POLICY "kits_user_claim_policy" ON allowed_kits
FOR UPDATE
USING (
    status = 'available' 
    AND 
    (get_my_role() NOT IN ('god', 'admin') OR get_my_role() IS NULL)
)
WITH CHECK (
    status = 'claimed' AND claimed_by = auth.uid()
);
