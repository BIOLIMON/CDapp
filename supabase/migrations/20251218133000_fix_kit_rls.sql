-- Migration to fix RLS Policy for allowed_kits
-- Allow users to see kits they have claimed!

DROP POLICY IF EXISTS "kits_select_optimized" ON allowed_kits;

CREATE POLICY "kits_select_optimized" ON allowed_kits 
FOR SELECT 
USING (
  status = 'available' 
  OR claimed_by = auth.uid() 
  OR (public.get_my_role() IN ('god', 'admin'))
);
