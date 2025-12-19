-- Database Schema Updates for LepiNet Web App
-- Run this in your Supabase SQL Editor

-- 1. Create review_comments table for experts to comment on reviews
CREATE TABLE IF NOT EXISTS public.review_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  commenter_id uuid NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT review_comments_pkey PRIMARY KEY (id),
  CONSTRAINT review_comments_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.expert_reviews(id) ON DELETE CASCADE,
  CONSTRAINT review_comments_commenter_id_fkey FOREIGN KEY (commenter_id) REFERENCES auth.users(id)
);

-- 2. Create notifications table for system notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['review_comment'::text, 'verification_status'::text, 'role_change'::text])),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid, -- Can reference review_id, comment_id, etc.
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Create user_activity_logs table for monitoring contributions
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (activity_type = ANY (ARRAY['record_upload'::text, 'review_submitted'::text, 'comment_posted'::text])),
  related_id uuid, -- Can reference ai_log_id, review_id, etc.
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_review_comments_review_id ON public.review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_commenter_id ON public.review_comments(commenter_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON public.ai_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_ai_log_id ON public.expert_reviews(ai_log_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for review_comments
CREATE POLICY "Anyone can view comments" ON public.review_comments FOR SELECT USING (true);
CREATE POLICY "Verified experts can comment" ON public.review_comments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.verification_status = 'verified'
    )
  );
CREATE POLICY "Users can update their own comments" ON public.review_comments FOR UPDATE 
  USING (commenter_id = auth.uid());
CREATE POLICY "Users can delete their own comments" ON public.review_comments FOR DELETE 
  USING (commenter_id = auth.uid());

-- 7. RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT 
  USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE 
  USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT 
  WITH CHECK (true); -- In production, restrict this to service role

-- 8. RLS Policies for user_activity_logs
CREATE POLICY "Admins can view all activity logs" ON public.user_activity_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 9. Create function to automatically create notification on comment
CREATE OR REPLACE FUNCTION notify_review_author()
RETURNS TRIGGER AS $$
DECLARE
  review_author_id uuid;
  record_id uuid;
BEGIN
  -- Get the author of the review and the ai_log_id (record) that was commented on
  SELECT reviewer_id, ai_log_id INTO review_author_id, record_id
  FROM public.expert_reviews
  WHERE id = NEW.review_id;
  
  -- Don't notify if commenter is the review author
  IF review_author_id != NEW.commenter_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      review_author_id,
      'review_comment',
      'New Comment on Your Review',
      'Someone commented on your expert review.',
      record_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for comment notifications
DROP TRIGGER IF EXISTS trigger_notify_review_author ON public.review_comments;
CREATE TRIGGER trigger_notify_review_author
  AFTER INSERT ON public.review_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_author();

-- 11. Create view for record statistics with review counts
CREATE OR REPLACE VIEW public.records_with_stats AS
SELECT 
  al.*,
  COUNT(DISTINCT er.id) as review_count,
  COUNT(DISTINCT rc.id) as comment_count,
  u.first_name || ' ' || u.last_name as uploader_name,
  u.verification_status as uploader_verification
FROM public.ai_logs al
LEFT JOIN public.expert_reviews er ON al.id = er.ai_log_id
LEFT JOIN public.review_comments rc ON er.id = rc.review_id
LEFT JOIN public.users u ON al.user_id = u.id
GROUP BY al.id, u.first_name, u.last_name, u.verification_status;

-- Grant access to the view
GRANT SELECT ON public.records_with_stats TO authenticated;
