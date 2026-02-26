-- Create ai_logs_with_stats view (simplified)
-- This view aggregates AI log records with basic review statistics for the training curator

DROP VIEW IF EXISTS ai_logs_with_stats;

CREATE OR REPLACE VIEW ai_logs_with_stats AS
SELECT 
    al.id,
    al.user_id,
    al.image_url,
    al.predicted_id,
    al.predicted_confidence,
    al.final_species_id,
    al.training_status,
    al.created_at,
    al.user_action,
    al.record_id,

    -- Predicted species info
    ps.common_name_english as predicted_common_name,
    ps.species_name_binomial as predicted_scientific_name,
    ps.common_name_sinhalese as predicted_sinhala_name,

    -- Final/Consensus species info
    fs.common_name_english as final_common_name,
    fs.species_name_binomial as final_scientific_name,
    fs.common_name_sinhalese as final_sinhala_name,

    -- Only review count at ai_log level
    COUNT(DISTINCT er.id) AS review_count,

    -- Verdict breakdown
    COUNT(DISTINCT CASE WHEN er.verdict = 'AGREE' THEN er.id END) as agree_count,
    COUNT(DISTINCT CASE WHEN er.verdict = 'CORRECT' THEN er.id END) as correct_count,
    COUNT(DISTINCT CASE WHEN er.verdict = 'UNSURE' THEN er.id END) as unsure_count,
    COUNT(DISTINCT CASE WHEN er.verdict = 'NOT_BUTTERFLY' THEN er.id END) as not_butterfly_count,

    -- Average quality
    ROUND(AVG(er.image_quality_rating)::numeric, 1) as avg_quality_rating,

    -- Species changed flag
    (al.predicted_id IS DISTINCT FROM al.final_species_id) as species_changed

FROM ai_logs al
LEFT JOIN species ps ON al.predicted_id = ps.butterfly_id
LEFT JOIN species fs ON al.final_species_id = fs.butterfly_id
LEFT JOIN expert_reviews er ON al.id = er.ai_log_id
GROUP BY 
    al.id,
    ps.common_name_english, ps.species_name_binomial, ps.common_name_sinhalese,
    fs.common_name_english, fs.species_name_binomial, fs.common_name_sinhalese;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON ai_logs_with_stats TO authenticated;

COMMENT ON VIEW ai_logs_with_stats IS 'Simplified view for training curator with AI log records and basic review counts';
