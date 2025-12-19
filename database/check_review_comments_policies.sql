-- Check existing policies on review_comments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'review_comments';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view review comments" ON review_comments;
DROP POLICY IF EXISTS "Verified experts can add comments" ON review_comments;

-- Enable RLS
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (authenticated) can view all comments
CREATE POLICY "Anyone can view review comments"
ON review_comments
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only verified experts can insert comments
CREATE POLICY "Verified experts can add comments"
ON review_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = review_comments.commenter_id
    AND users.verification_status = 'verified'
  )
);
