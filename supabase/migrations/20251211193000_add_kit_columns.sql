-- Run this in your Supabase SQL Editor to add the missing columns

ALTER TABLE allowed_kits 
ADD COLUMN IF NOT EXISTS kit_number TEXT,
ADD COLUMN IF NOT EXISTS variety TEXT;

-- Optional: Add a comment or description if supported
COMMENT ON COLUMN allowed_kits.kit_number IS 'Numero de etiqueta visual de la caja (ej. "Kit 10")';
COMMENT ON COLUMN allowed_kits.variety IS 'Variedad de la planta (ej. "Cherry", "Roma")';
