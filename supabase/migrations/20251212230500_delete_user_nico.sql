
DO $$
DECLARE
    target_uid UUID;
BEGIN
    -- 1. Find the user ID in auth.users (System table) or public.profiles
    -- We join or check profiles because auth.users is sometimes restricted even for scripts depending on context,
    -- but usually 'postgres' role can see it.
    SELECT id INTO target_uid FROM auth.users WHERE email = 'nicolasmulleraguirre@gmail.com';
    
    IF target_uid IS NULL THEN
        RAISE NOTICE 'User nicolasmulleraguirre@gmail.com not found in auth.users.';
        -- Fallback: check profiles if they are a "ghost" profile without auth user (unlikely but possible)
        SELECT id INTO target_uid FROM public.profiles WHERE email = 'nicolasmulleraguirre@gmail.com';
        
        IF target_uid IS NULL THEN
            RAISE NOTICE 'User not found in profiles either. Nothing to do.';
            RETURN;
        END IF;
    END IF;

    RAISE NOTICE 'Found User ID: %', target_uid;

    -- 2. Release Kit (Clean up Allowed Kits reference)
    -- Even though ON DELETE SET NULL exists, manually resetting status is better for logic.
    UPDATE public.allowed_kits 
    SET status = 'available', claimed_by = NULL, claimed_at = NULL 
    WHERE claimed_by = target_uid;
    
    RAISE NOTICE 'Released kits for user.';

    -- 3. Delete from public.profiles 
    -- (If we delete auth.users next, this happens automatically via Cascade, but being explicit helps avoid "update on table violates foreign key constraint" if order is weird)
    DELETE FROM public.profiles WHERE id = target_uid;
    
    RAISE NOTICE 'Deleted from profiles.';

    -- 4. Delete from auth.users (The root)
    DELETE FROM auth.users WHERE id = target_uid;
    
    RAISE NOTICE 'Deleted from auth.users.';
    
END $$;
