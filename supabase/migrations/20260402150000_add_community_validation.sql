-- Add columns to incidents if they don't exist
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS upvotes INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS downvotes INT DEFAULT 0;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create incident_votes table
CREATE TABLE IF NOT EXISTS public.incident_votes (
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (incident_id, user_id)
);
ALTER TABLE public.incident_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can select votes" ON public.incident_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Citizens can insert votes" ON public.incident_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create a Postgres function to safely cast a vote
CREATE OR REPLACE FUNCTION vote_incident(p_incident_id UUID, p_user_id UUID, p_vote_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upvotes INT;
  v_downvotes INT;
BEGIN
  -- Insert vote (will fail if user already voted due to PK)
  INSERT INTO public.incident_votes(incident_id, user_id, vote_type)
  VALUES (p_incident_id, p_user_id, p_vote_type);

  -- Update count
  IF p_vote_type = 'up' THEN
    UPDATE public.incidents SET upvotes = upvotes + 1 WHERE id = p_incident_id
    RETURNING upvotes INTO v_upvotes;
    
    IF v_upvotes >= 3 THEN
       UPDATE public.incidents SET is_verified = true WHERE id = p_incident_id;
    END IF;
  ELSE
    UPDATE public.incidents SET downvotes = downvotes + 1 WHERE id = p_incident_id
    RETURNING downvotes INTO v_downvotes;
    
    IF v_downvotes >= 3 THEN
       DELETE FROM public.incidents WHERE id = p_incident_id;
    END IF;
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    -- user already voted, do nothing or raise
    RAISE EXCEPTION 'User already voted on this incident';
END;
$$;

-- Add a public storage policy for incident-images if it doesn't already allow authenticated INSERT
BEGIN;
  -- Try to create the bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('incident-images', 'incident-images', true)
  ON CONFLICT (id) DO NOTHING;
COMMIT;

-- Ensure RLS on storage is permissive for authenticated users to upload and read
CREATE POLICY "Public Read Incident Images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'incident-images');

CREATE POLICY "Auth Insert Incident Images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'incident-images' AND auth.role() = 'authenticated');
