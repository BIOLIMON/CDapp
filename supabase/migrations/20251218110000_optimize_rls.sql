-- Migration: Optimize RLS Policies
-- Description: Fixes 'Auth RLS Initialization Plan' performance warnings and 'Multiple Permissive Policies' redundancy warnings.

-- Optimizations used:
-- 1. wrapping auth.uid() in (select auth.uid()) to avoid per-row execution
-- 2. Consolidating multiple policies into single clean policies per action

-- ============================================================
-- 1. HELPER FUNCTIONS
-- ============================================================

-- Ensure get_my_role is efficient and secure
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE -- Stable indicates it doesn't change within a scan for the same input (no input here, but good practice for perf)
AS $$
DECLARE
  retrieved_role text;
BEGIN
  SELECT role INTO retrieved_role FROM public.profiles WHERE id = (select auth.uid());
  RETURN retrieved_role;
END;
$$;


-- ============================================================
-- 2. PROFILES
-- ============================================================

-- Drop ALL known past policies to ensure clean slate
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles view" ON profiles;

-- Enable RLS (just in case)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Users see themselves, Global Admins see everyone
CREATE POLICY "profiles_select_optimized" ON profiles
FOR SELECT
USING (
  (select auth.uid()) = id 
  OR 
  (public.get_my_role() IN ('god', 'admin'))
);

-- INSERT: User inserts themselves (Registration)
CREATE POLICY "profiles_insert_optimized" ON profiles
FOR INSERT
WITH CHECK (
  (select auth.uid()) = id
);

-- UPDATE: Users update themselves, God updates everyone
CREATE POLICY "profiles_update_optimized" ON profiles
FOR UPDATE
USING (
  (select auth.uid()) = id 
  OR 
  (public.get_my_role() = 'god')
)
WITH CHECK (
  (select auth.uid()) = id 
  OR 
  (public.get_my_role() = 'god')
);


-- ============================================================
-- 3. ALLOWED KITS
-- ============================================================

-- Drop ALL known past policies
DROP POLICY IF EXISTS "kits_select_policy" ON allowed_kits;
DROP POLICY IF EXISTS "kits_all_manage_policy" ON allowed_kits;
DROP POLICY IF EXISTS "kits_user_claim_policy" ON allowed_kits;
DROP POLICY IF EXISTS "kits_god_policy" ON allowed_kits;
DROP POLICY IF EXISTS "Admins can do everything" ON allowed_kits;
DROP POLICY IF EXISTS "kits_admin_all_policy" ON allowed_kits;
DROP POLICY IF EXISTS "Users can claim kits" ON allowed_kits;
DROP POLICY IF EXISTS "Public can check kit availability" ON allowed_kits;
DROP POLICY IF EXISTS "Public check availability" ON allowed_kits;

ALTER TABLE allowed_kits ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can see available kits (for registration check), Admins see all
CREATE POLICY "kits_select_optimized" ON allowed_kits
FOR SELECT
USING (
  status = 'available' 
  OR 
  (public.get_my_role() IN ('god', 'admin'))
);

-- MANAGE (Insert/Update/Delete): Only God/Admin
CREATE POLICY "kits_admin_manage_optimized" ON allowed_kits
FOR ALL
USING (
  public.get_my_role() IN ('god', 'admin')
)
WITH CHECK (
  public.get_my_role() IN ('god', 'admin')
);

-- UPDATE (Claiming): Users can claim available kits
CREATE POLICY "kits_user_claim_optimized" ON allowed_kits
FOR UPDATE
USING (
  status = 'available'
  AND
  (select auth.uid()) IS NOT NULL
)
WITH CHECK (
  status = 'claimed' 
  AND 
  claimed_by = (select auth.uid())
);


-- ============================================================
-- 4. EXPERIMENT ENTRIES
-- ============================================================

-- Drop ALL known past policies
DROP POLICY IF EXISTS "entries_select_policy" ON experiment_entries;
DROP POLICY IF EXISTS "entries_insert_policy" ON experiment_entries;
DROP POLICY IF EXISTS "entries_update_policy" ON experiment_entries;
DROP POLICY IF EXISTS "entries_delete_policy" ON experiment_entries;
DROP POLICY IF EXISTS "Users can view their own entries" ON experiment_entries;
DROP POLICY IF EXISTS "Admins can view all entries" ON experiment_entries;
DROP POLICY IF EXISTS "Public entries view" ON experiment_entries;
DROP POLICY IF EXISTS "Users can insert their own entries" ON experiment_entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON experiment_entries;
DROP POLICY IF EXISTS "Users can delete their own entries" ON experiment_entries;

ALTER TABLE experiment_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: Users see own, Admins see all
CREATE POLICY "entries_select_optimized" ON experiment_entries
FOR SELECT
USING (
  user_id = (select auth.uid())
  OR
  (public.get_my_role() IN ('god', 'admin'))
);

-- INSERT: Users insert for themselves
CREATE POLICY "entries_insert_optimized" ON experiment_entries
FOR INSERT
WITH CHECK (
  user_id = (select auth.uid())
);

-- UPDATE: Users update own, Admins update any
CREATE POLICY "entries_update_optimized" ON experiment_entries
FOR UPDATE
USING (
  user_id = (select auth.uid())
  OR
  (public.get_my_role() IN ('god', 'admin'))
)
WITH CHECK (
  user_id = (select auth.uid())
  OR
  (public.get_my_role() IN ('god', 'admin'))
);

-- DELETE: Users delete own, Admins delete any
CREATE POLICY "entries_delete_optimized" ON experiment_entries
FOR DELETE
USING (
  user_id = (select auth.uid())
  OR
  (public.get_my_role() IN ('god', 'admin'))
);


-- ============================================================
-- 5. POTS
-- ============================================================

-- Drop ALL known past policies
DROP POLICY IF EXISTS "Users can view own pots" ON pots;
DROP POLICY IF EXISTS "Admins can view all pots" ON pots;
DROP POLICY IF EXISTS "Users can insert own pots" ON pots;
DROP POLICY IF EXISTS "Users can update own pots" ON pots;
DROP POLICY IF EXISTS "Public pots view" ON pots;

ALTER TABLE pots ENABLE ROW LEVEL SECURITY;

-- Note: POTS functionality relies heavily on being linked to an entry.
-- We often verify ownership via the linked entry, but RLS on POTS directly is good for defense in depth.
-- However, joining to entries in a policy can be expensive. 
-- Assuming standard usage:
-- SELECT: Users see pots linked to their entries, or Admins see all.

CREATE POLICY "pots_select_optimized" ON pots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM experiment_entries e 
    WHERE e.id = pots.entry_id 
    AND (
       e.user_id = (select auth.uid())
       OR 
       (public.get_my_role() IN ('god', 'admin'))
    )
  )
);

-- INSERT: Insert if linked entry belongs to user
CREATE POLICY "pots_insert_optimized" ON pots
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM experiment_entries e 
    WHERE e.id = pots.entry_id 
    AND e.user_id = (select auth.uid())
  )
);

-- UPDATE: Update if linked entry belongs to user (or admin)
CREATE POLICY "pots_update_optimized" ON pots
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM experiment_entries e 
    WHERE e.id = pots.entry_id 
    AND (
       e.user_id = (select auth.uid())
       OR 
       (public.get_my_role() IN ('god', 'admin'))
    )
  )
);

-- DELETE: Delete if linked entry belongs to user (or admin)
CREATE POLICY "pots_delete_optimized" ON pots
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM experiment_entries e 
    WHERE e.id = pots.entry_id 
    AND (
       e.user_id = (select auth.uid())
       OR 
       (public.get_my_role() IN ('god', 'admin'))
    )
  )
);

