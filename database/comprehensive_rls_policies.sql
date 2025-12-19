-- Comprehensive RLS Policies for LepiNet
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. AI_LOGS TABLE
-- ============================================
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all ai_logs" ON public.ai_logs;
DROP POLICY IF EXISTS "Users can insert their own ai_logs" ON public.ai_logs;
DROP POLICY IF EXISTS "Users can update their own ai_logs" ON public.ai_logs;

-- Allow authenticated users to view all AI logs (needed for expert reviews)
CREATE POLICY "Users can view all ai_logs"
ON public.ai_logs
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert their own ai_logs"
ON public.ai_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own logs
CREATE POLICY "Users can update their own ai_logs"
ON public.ai_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 2. SPECIES TABLE
-- ============================================
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to species" ON public.species;

-- Allow everyone (including anonymous) to read species data
CREATE POLICY "Allow public read access to species"
ON public.species
FOR SELECT
TO public
USING (true);

-- ============================================
-- 3. EXPERT_REVIEWS TABLE
-- ============================================
ALTER TABLE public.expert_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all reviews" ON public.expert_reviews;
DROP POLICY IF EXISTS "Verified experts can insert reviews" ON public.expert_reviews;
DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON public.expert_reviews;

-- Allow authenticated users to view all reviews
CREATE POLICY "Users can view all reviews"
ON public.expert_reviews
FOR SELECT
TO authenticated
USING (true);

-- Allow verified experts to insert reviews
CREATE POLICY "Verified experts can insert reviews"
ON public.expert_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.verification_status = 'verified'
  )
);

-- Allow reviewers to update their own reviews
CREATE POLICY "Reviewers can update their own reviews"
ON public.expert_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id);

-- ============================================
-- 4. USERS TABLE
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Allow authenticated users to view all user profiles
CREATE POLICY "Users can view all profiles"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. REVIEW_COMMENTS TABLE
-- ============================================
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all comments" ON public.review_comments;
DROP POLICY IF EXISTS "Verified experts can insert comments" ON public.review_comments;

-- Allow authenticated users to view all comments
CREATE POLICY "Users can view all comments"
ON public.review_comments
FOR SELECT
TO authenticated
USING (true);

-- Allow verified experts to insert comments
CREATE POLICY "Verified experts can insert comments"
ON public.review_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.verification_status = 'verified'
  )
);

-- ============================================
-- 6. REVIEW_RATINGS TABLE
-- ============================================
ALTER TABLE public.review_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all ratings" ON public.review_ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.review_ratings;

-- Allow authenticated users to view all ratings
CREATE POLICY "Users can view all ratings"
ON public.review_ratings
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert ratings
CREATE POLICY "Users can insert their own ratings"
ON public.review_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = rater_id);

-- ============================================
-- 7. NOTIFICATIONS TABLE
-- ============================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Allow users to view only their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow system/authenticated users to insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- 8. USER_ACTIVITY_LOGS TABLE
-- ============================================
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activity" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.user_activity_logs;

-- Allow users to view their own activity
CREATE POLICY "Users can view their own activity"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own activity logs
CREATE POLICY "Users can insert their own activity"
ON public.user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Verify all policies
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
