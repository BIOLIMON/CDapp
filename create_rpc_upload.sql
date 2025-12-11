-- FUNCTION: admin_upload_kits
-- DESCRIPTION: Allows uploading kits using a secret password instead of user authentication.
-- RATIONALE: This supports the "System Admin" mode which does not use a Supabase Auth User.

CREATE OR REPLACE FUNCTION public.admin_upload_kits(
    secret_key TEXT,
    kits_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
    inserted_count INT := 0;
BEGIN
    -- 1. Validate Secret Password
    -- This matches the hardcoded password in the frontend.
    IF secret_key != 'ADMIN123' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid admin password');
    END IF;

    -- 2. Loop and Insert
    FOR item IN SELECT * FROM jsonb_array_elements(kits_data)
    LOOP
        INSERT INTO public.allowed_kits (code, batch_id, status)
        VALUES (
            item->>'code', 
            item->>'batch_id',
            'available'
        )
        ON CONFLICT (code) DO NOTHING;
        
        IF FOUND THEN
            inserted_count := inserted_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'count', inserted_count);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
