
-- Drop old function signature if it differs (parameters) to avoid overloading confusion, 
-- though CREATE OR REPLACE handles same sig. We'll try to just overwrite or create new.

CREATE OR REPLACE FUNCTION admin_upload_kits_v2(
    kits_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (postgres), bypassing RLS
SET search_path = public -- Security best practice
AS $$
DECLARE
    auth_role text;
    inserted_count int;
BEGIN
    -- 1. Check permissions (User must be logged in and be an admin)
    SELECT role INTO auth_role FROM profiles WHERE id = auth.uid();
    
    IF auth_role IS NULL OR auth_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required');
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
