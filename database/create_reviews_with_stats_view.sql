-- Create reviews_with_stats view
-- This view provides expert reviews with aggregated feedback statistics at the review level

DROP VIEW IF EXISTS reviews_with_stats;

CREATE OR REPLACE VIEW reviews_with_stats AS
SELECT 
    er.id as review_id,
    er.ai_log_id,
    er.reviewer_id,
    er.verdict,
    er.agreed_with_ai,
    er.identified_species_name,
    er.is_new_discovery,
    er.identification_notes,
    er.created_at,
    er.image_quality_rating,
    er.wings_visible,
    er.antennae_visible,
    er.body_visible,
    er.patterns_visible,

    -- Comments per review
    COUNT(DISTINCT rc.id) as comment_count,
    COUNT(DISTINCT CASE WHEN rc.agrees_with_review = true THEN rc.id END) as agree_comment_count,
    COUNT(DISTINCT CASE WHEN rc.agrees_with_review = false THEN rc.id END) as disagree_comment_count,

    -- Ratings per review
    COUNT(DISTINCT rr.id) as rating_count,
    COUNT(DISTINCT CASE WHEN rr.is_helpful = true THEN rr.id END) as helpful_count,
    COUNT(DISTINCT CASE WHEN rr.is_helpful = false THEN rr.id END) as not_helpful_count,

    -- Weighted score
    ROUND((
        1.0 +
        COUNT(DISTINCT CASE WHEN rr.is_helpful = true THEN rr.id END) * 0.5 -
        COUNT(DISTINCT CASE WHEN rr.is_helpful = false THEN rr.id END) * 0.5 +
        COUNT(DISTINCT CASE WHEN rc.agrees_with_review = true THEN rc.id END) * 0.5 -
        COUNT(DISTINCT CASE WHEN rc.agrees_with_review = false THEN rc.id END) * 0.5
    )::numeric, 2) as weighted_score

FROM expert_reviews er
LEFT JOIN review_comments rc ON er.id = rc.review_id
LEFT JOIN review_ratings rr ON er.id = rr.review_id
GROUP BY er.id;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON reviews_with_stats TO authenticated;

COMMENT ON VIEW reviews_with_stats IS 'Expert reviews with comments and ratings aggregated at the review level for detail views';
