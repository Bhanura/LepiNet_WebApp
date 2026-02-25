-- RLS Policies for Deleting Reviews and Comments
-- Users can only delete their own reviews and comments

-- ============================================
-- EXPERT REVIEWS - Delete Policy
-- ============================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.expert_reviews;

-- Allow users to delete only their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.expert_reviews
FOR DELETE
USING (auth.uid() = reviewer_id);

-- Note: When a review is deleted, all associated comments will be 
-- automatically deleted due to the ON DELETE CASCADE foreign key


-- ============================================
-- REVIEW COMMENTS - Delete Policy
-- ============================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.review_comments;

-- Allow users to delete only their own comments
CREATE POLICY "Users can delete their own comments"
ON public.review_comments
FOR DELETE
USING (auth.uid() = commenter_id);


-- ============================================
-- Verification
-- ============================================

-- View all policies for expert_reviews table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'expert_reviews';

-- View all policies for review_comments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'review_comments';
