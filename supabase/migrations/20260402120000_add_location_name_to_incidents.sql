-- Add location_name to incidents table
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location_name TEXT;
