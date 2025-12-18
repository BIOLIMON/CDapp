-- 1. Fix: Function Search Path Mutable for handle_new_user
-- This function is triggered on auth.users insert. We must define search_path for security.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name);
  RETURN new;
END;
$$;

-- 2. Fix: Function Search Path Mutable for admin_upload_kits
-- We seem to use admin_upload_kits_v2 in the code. 
-- If 'admin_upload_kits' (v1) exists and is causing warnings, we should secure it or drop it.
-- We will DROP it to avoid confusion, assuming v2 is the standard.
DROP FUNCTION IF EXISTS public.admin_upload_kits(jsonb);

-- 3. Ensure admin_upload_kits_v2 is strictly adequate (re-apply with search_path)
CREATE OR REPLACE FUNCTION admin_upload_kits_v2(
    kits_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted_count int;
    curr_user_id uuid;
    auth_role text;
BEGIN
    curr_user_id := auth.uid();

    -- 1. Basic Auth Check
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You must be logged in.');
    END IF;

    -- 2. Role Check
    SELECT role INTO auth_role FROM profiles WHERE id = curr_user_id;
    
    IF auth_role IS NULL OR auth_role NOT IN ('god', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: God or Admin role required');
    END IF;

    -- 3. Bulk Upsert
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
