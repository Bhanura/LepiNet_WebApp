-- Add Foreign Key Constraint for ai_logs.predicted_id to species.butterfly_id
-- Run this in your Supabase SQL Editor

-- IMPORTANT: Before running this migration, ensure:
-- 1. All existing predicted_id values in ai_logs either match a butterfly_id in species table OR are NULL
-- 2. Clean up any orphaned records if necessary

-- Step 1: Check for orphaned records (records that don't have matching species)
-- Run this first to see if there are any issues:
/*
SELECT DISTINCT al.predicted_id 
FROM ai_logs al
LEFT JOIN species s ON al.predicted_id = s.butterfly_id
WHERE al.predicted_id IS NOT NULL 
  AND s.butterfly_id IS NULL;
*/

-- Step 2: (Optional) Clean up orphaned records if any exist
-- Uncomment and modify as needed:
/*
UPDATE ai_logs 
SET predicted_id = NULL 
WHERE predicted_id NOT IN (SELECT butterfly_id FROM species);
*/

-- Step 3: Add the foreign key constraint
ALTER TABLE public.ai_logs
ADD CONSTRAINT ai_logs_predicted_id_fkey 
FOREIGN KEY (predicted_id) 
REFERENCES public.species(butterfly_id)
ON DELETE SET NULL  -- If a species is deleted, set predicted_id to NULL
ON UPDATE CASCADE;  -- If butterfly_id is updated, cascade the change

-- Step 4: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_logs_predicted_id 
ON public.ai_logs(predicted_id);

-- Verification: Check that the constraint was added successfully
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'ai_logs'
    AND kcu.column_name = 'predicted_id';
