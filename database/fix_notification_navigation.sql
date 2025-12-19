-- Fix notification trigger to store ai_log_id instead of comment_id
-- This allows clicking the notification to navigate to the correct record page

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

-- Verify the function was updated
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'notify_review_author';
