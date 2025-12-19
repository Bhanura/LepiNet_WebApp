-- Update existing notifications to have the correct ai_log_id as related_id
-- This fixes old notifications so clicking them navigates to the correct record page

UPDATE public.notifications n
SET related_id = er.ai_log_id
FROM public.review_comments rc
JOIN public.expert_reviews er ON er.id = rc.review_id
WHERE n.type = 'review_comment'
  AND n.related_id = rc.id;

-- Verify the update
SELECT 
  n.id as notification_id,
  n.type,
  n.related_id as ai_log_id,
  rc.id as comment_id,
  er.id as review_id
FROM public.notifications n
LEFT JOIN public.review_comments rc ON rc.id = n.related_id
LEFT JOIN public.expert_reviews er ON er.ai_log_id = n.related_id
WHERE n.type = 'review_comment'
ORDER BY n.created_at DESC
LIMIT 10;
