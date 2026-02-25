-- Add agrees_with_review column to review_comments table
-- This tracks whether the commenter agrees or disagrees with the original review
-- REQUIRED: Every comment must indicate agreement or disagreement

ALTER TABLE public.review_comments 
ADD COLUMN agrees_with_review BOOLEAN NOT NULL;

-- TRUE = agrees with the review
-- FALSE = disagrees with the review

COMMENT ON COLUMN public.review_comments.agrees_with_review IS 
'Whether the commenter agrees with the original review verdict. Required field.';
