-- Seed data for GTM OS
-- Run after migrations: psql $DATABASE_URL -f seeds/seed_data.sql

-- Insert sample qualified accounts
INSERT INTO qualified_accounts (
    user_id, company_name, website, employee_count, 
    estimated_spend, spend_tier, funding_stage, recent_signal,
    pain_point_indicators, head_of_revops_name, score, status
) VALUES 
('system', 'Qualified.io', 'https://qualified.io', 150, '$500K-$1M', 'tier_2', 'Series B', 'Feb 2024 $17M funding', ARRAY['multiple tools', 'scaling GTM'], 'Sarah Chen', 5, 'new'),
('system', 'Chili Piper', 'https://chillipiper.com', 200, '$1M-$2M', 'tier_1', 'Series B', 'Global expansion', ARRAY['scheduling chaos', 'revenue ops'], 'Mike Johnson', 5, 'new'),
('system', 'Walnut', 'https://walnut.io', 180, '$500K-$1M', 'tier_2', 'Series B', '3x growth', ARRAY['demo platform', 'buyer experience'], 'Lisa Park', 5, 'new');

-- Insert sample feedback signals
INSERT INTO feedback_signals (
    user_id, signal_type, card_type, section, duration_ms, metadata
) VALUES
('system', 'dwell', 'kpi', 'hero', 15000, '{"engagement": "high"}'),
('system', 'explicit_positive', 'intelligence', 'recommendations', 5000, '{"rating": 5}'),
('system', 'dwell', 'objectives', 'list', 8000, '{"scroll_depth": 80}');

-- Insert sample preference model
INSERT INTO preference_models (
    user_id, card_order, card_scores, communication_style, autonomy_level
) VALUES
('system', 
 '["intelligence", "kpi", "objectives", "alerts"]', 
 '{"intelligence": 1.5, "kpi": 1.2, "objectives": 0.8, "alerts": 0.3}',
 'concise',
 'high'
);

-- Insert sample autonomous tasks
INSERT INTO autonomous_tasks (
    user_id, task_type, title, description, status, priority,
    confidence_score, estimated_duration_minutes
) VALUES
('system', 'kpi_investigation', 'Investigate MQL decline', 
 'MQL volume dropped 15% vs last week. Investigate root cause.',
 'pending', 'high', 85, 60),
('system', 'blocker_mitigation', 'Assign owner to large deal',
 'Opportunity >$100K has no assigned owner. Risk of stall.',
 'pending', 'critical', 92, 15);

-- Verify seed data
SELECT 'qualified_accounts' as table_name, count(*) as row_count FROM qualified_accounts
UNION ALL
SELECT 'feedback_signals', count(*) FROM feedback_signals
UNION ALL
SELECT 'preference_models', count(*) FROM preference_models
UNION ALL
SELECT 'autonomous_tasks', count(*) FROM autonomous_tasks;
