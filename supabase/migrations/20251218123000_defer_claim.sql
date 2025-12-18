-- Migration to fix handle_new_user trigger - REVERT AUTO-CLAIM
-- Captures kit_code from metadata but DOES NOT claim it in allowed_kits
-- The kit will be claimed explicitly by the client after email verification and login.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Create Profile with metadata
  INSERT INTO public.profiles (
      id, 
      email, 
      name,
      kit_code,
      gender,
      birth_date,
      avatar
  )
  VALUES (
      new.id, 
      new.email, 
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'kitCode', -- Register.tsx sends 'kitCode'
      new.raw_user_meta_data->>'gender',
      (new.raw_user_meta_data->>'birthDate')::date,
      new.raw_user_meta_data->>'avatar'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    kit_code = COALESCE(EXCLUDED.kit_code, profiles.kit_code),
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date);

  -- 2. AUTO-CLAIM REMOVED
  -- We wait for the user to confirm email and login. 
  -- Then the client calls api.claimKit() based on the profile's kit_code.

  RETURN new;
END;
$$;
