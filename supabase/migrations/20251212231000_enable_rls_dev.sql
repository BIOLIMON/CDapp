
-- Enable RLS on experiment_entries
ALTER TABLE experiment_entries ENABLE ROW LEVEL SECURITY;

-- Helper function to get role (re-declaring if needed, or assuming it exists from previous migrations)
-- We'll just use the direct profile check or existing function if available. 
-- Best to use direct query or policy to avoid dependency issues if function dropped.

-- 1. SELECT Policy
CREATE POLICY "entries_select_policy" ON experiment_entries
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin')))
);

-- 2. INSERT Policy
CREATE POLICY "entries_insert_policy" ON experiment_entries
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id)
);

-- 3. UPDATE Policy
CREATE POLICY "entries_update_policy" ON experiment_entries
FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin')))
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin')))
);

-- 4. DELETE Policy
CREATE POLICY "entries_delete_policy" ON experiment_entries
FOR DELETE
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('god', 'admin')))
);
