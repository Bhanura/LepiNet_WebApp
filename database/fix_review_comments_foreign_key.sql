-- Fix review_comments foreign key to point to public.users instead of auth.users

-- First, check existing constraints
DO $$
BEGIN
    -- Drop old foreign key if it exists and points to auth.users
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'review_comments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND ccu.table_schema = 'auth'
    ) THEN
        ALTER TABLE review_comments DROP CONSTRAINT review_comments_commenter_id_fkey;
        RAISE NOTICE 'Dropped old foreign key to auth.users';
    END IF;
END $$;

-- Add new foreign key to public.users
ALTER TABLE review_comments
DROP CONSTRAINT IF EXISTS review_comments_commenter_id_fkey;

ALTER TABLE review_comments
ADD CONSTRAINT review_comments_commenter_id_fkey
FOREIGN KEY (commenter_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Verify the change
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'review_comments'
    AND kcu.column_name = 'commenter_id';
