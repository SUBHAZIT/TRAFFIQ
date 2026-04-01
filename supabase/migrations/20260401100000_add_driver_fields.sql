-- Add driver-specific fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS vehicle_reg_id TEXT,
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Add index on is_approved for faster admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);

-- Update handle_new_user to capture metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    phone, 
    license_number, 
    vehicle_reg_id, 
    vehicle_type, 
    is_approved
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'license_number',
    NEW.raw_user_meta_data->>'vehicle_reg_id',
    NEW.raw_user_meta_data->>'vehicle_type',
    COALESCE((NEW.raw_user_meta_data->>'is_approved')::boolean, false)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'citizen'));
  
  RETURN NEW;
END;
$$;
