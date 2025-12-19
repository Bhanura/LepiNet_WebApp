-- Fix Row Level Security (RLS) for species table
-- Run this in your Supabase SQL Editor

-- Enable RLS on species table (if not already enabled)
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to species" ON public.species;
DROP POLICY IF EXISTS "species_select_policy" ON public.species;

-- Create a policy to allow everyone to read species data
-- Species data is public information and should be readable by all
CREATE POLICY "Allow public read access to species"
ON public.species
FOR SELECT
TO public
USING (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'species';
