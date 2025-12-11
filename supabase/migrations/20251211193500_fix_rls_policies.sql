
-- Enable RLS just in case
ALTER TABLE allowed_kits ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies if they conflict (optional, but good practice if we want to be sure)
-- DROP POLICY IF EXISTS "Admins can manage kits" ON allowed_kits;

-- Create a comprehensive policy for Admins
CREATE POLICY "Admins can manage all kits" ON allowed_kits
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Ensure normal users can still read available kits (assuming this is needed for validation?)
CREATE POLICY "Users can view available kits" ON allowed_kits
  FOR SELECT
  USING (true);
