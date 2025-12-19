-- Check if review_comments table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'review_comments'
ORDER BY ordinal_position;

-- Check foreign key constraints
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
    AND tc.table_name = 'review_comments';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'review_comments';

-- Try to select with JOIN (this is what the app does)
SELECT 
    rc.*,
    u.first_name,
    u.last_name,
    u.profession
FROM review_comments rc
LEFT JOIN users u ON u.id = rc.commenter_id
LIMIT 5;
