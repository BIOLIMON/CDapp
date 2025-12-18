-- Migration to fix handle_new_user trigger
-- Captures kit_code from metadata AND automatically claims the kit

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Create Profile
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

  -- 2. Claim Kit (Auto-claim on signup)
  IF new.raw_user_meta_data->>'kitCode' IS NOT NULL THEN
      UPDATE public.allowed_kits 
      SET status = 'claimed', 
          claimed_by = new.id,
          claimed_at = NOW()
      WHERE code = new.raw_user_meta_data->>'kitCode'
      AND status = 'available'; -- Only claim if available, or maybe force update if re-registering? Safe to check available.
  END IF;

  RETURN new;
END;
$$;
