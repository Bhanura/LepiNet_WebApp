-- Add Foreign Key Constraints for expert_reviews table
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing foreign key that points to auth.users
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'expert_reviews_reviewer_id_fkey'
        AND table_name = 'expert_reviews'
    ) THEN
        ALTER TABLE public.expert_reviews 
        DROP CONSTRAINT expert_reviews_reviewer_id_fkey;
    END IF;
END $$;

-- 2. Add new foreign key for reviewer_id -> public.users.id (not auth.users)
ALTER TABLE public.expert_reviews 
ADD CONSTRAINT expert_reviews_reviewer_id_fkey 
FOREIGN KEY (reviewer_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 3. Verify ai_log_id foreign key exists (should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'expert_reviews_ai_log_id_fkey'
        AND table_name = 'expert_reviews'
    ) THEN
        ALTER TABLE public.expert_reviews 
        ADD CONSTRAINT expert_reviews_ai_log_id_fkey 
        FOREIGN KEY (ai_log_id) 
        REFERENCES public.ai_logs(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create index for better JOIN performance
CREATE INDEX IF NOT EXISTS idx_expert_reviews_reviewer_id ON public.expert_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_ai_log_id ON public.expert_reviews(ai_log_id);

-- Verify the foreign keys were created
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'expert_reviews' 
  AND tc.constraint_type = 'FOREIGN KEY';
