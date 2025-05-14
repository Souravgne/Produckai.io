/*
  # Seed insights data with customer impacts

  1. Changes
    - Add sample insights with themes and customer impacts
    - Ensure proper relationships between insights, themes, and customers
    - Add realistic customer impact data
  
  2. Data
    - Sample insights across different themes
    - Customer impacts with varying ACV values
    - Theme assignments with confidence scores
*/

-- Create temporary table for insights
CREATE TEMP TABLE temp_insights (
  id uuid,
  content text,
  source text,
  sentiment text,
  theme_name text,
  created_by uuid,
  created_at timestamptz
);

-- Insert sample insights with explicit theme assignments
INSERT INTO temp_insights (id, content, source, sentiment, theme_name, created_by, created_at)
VALUES
  -- Integration Issues theme
  (
    gen_random_uuid(),
    'API rate limits are too restrictive for enterprise usage. Need higher limits.',
    'slack',
    'negative',
    'Integration Issues',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Syncing contacts with Salesforce often fails and delays our campaigns.',
    'slack',
    'negative',
    'Integration Issues',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Data inconsistencies between systems are causing major headaches.',
    'hubspot',
    'negative',
    'Integration Issues',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  
  -- User Experience theme
  (
    gen_random_uuid(),
    'The new dashboard layout is much more intuitive. Love the quick access.',
    'hubspot',
    'positive',
    'User Experience',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Mobile app crashes frequently when processing large datasets.',
    'slack',
    'negative',
    'User Experience',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Navigation is much smoother after the recent update.',
    'document',
    'positive',
    'User Experience',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),

  -- Feature Requests theme
  (
    gen_random_uuid(),
    'We need a bulk upload feature for contacts. Manual entry is time-consuming.',
    'slack',
    'negative',
    'Feature Requests',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Would love to see better filtering options in the analytics dashboard.',
    'hubspot',
    'neutral',
    'Feature Requests',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Custom report builder would save us hours of work.',
    'document',
    'neutral',
    'Feature Requests',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),

  -- Security & Compliance theme
  (
    gen_random_uuid(),
    'SSO integration with Okta would be a game-changer for security.',
    'hubspot',
    'neutral',
    'Security & Compliance',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Need better audit logs for compliance reporting.',
    'slack',
    'negative',
    'Security & Compliance',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Data encryption at rest should be enabled by default.',
    'document',
    'neutral',
    'Security & Compliance',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),

  -- Data Accuracy theme
  (
    gen_random_uuid(),
    'Real-time data sync would prevent most accuracy issues.',
    'slack',
    'negative',
    'Data Accuracy',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Duplicate detection needs improvement.',
    'hubspot',
    'negative',
    'Data Accuracy',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    gen_random_uuid(),
    'Data validation rules have improved accuracy significantly.',
    'document',
    'positive',
    'Data Accuracy',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  );

-- Insert insights
INSERT INTO insights (id, content, source, sentiment, created_by, created_at)
SELECT id, content, source, sentiment, created_by, created_at
FROM temp_insights;

-- Link insights to themes
INSERT INTO insight_themes (insight_id, theme_id, confidence_score)
SELECT 
  i.id,
  t.id,
  0.8 + random() * 0.2 -- Random score between 0.8 and 1.0
FROM temp_insights i
JOIN themes t ON t.name = i.theme_name;

-- Create temporary table for customers
CREATE TEMP TABLE temp_customers (
  name text,
  base_acv integer,
  tier text
);

-- Insert customer data
INSERT INTO temp_customers (name, base_acv, tier)
VALUES
  ('Acme Corporation', 50000, 'enterprise'),
  ('TechCorp Solutions', 75000, 'enterprise'),
  ('Global Industries', 100000, 'enterprise'),
  ('Innovative Systems', 60000, 'enterprise'),
  ('Enterprise Solutions Ltd', 85000, 'enterprise'),
  ('Digital Dynamics', 45000, 'growth'),
  ('Future Technologies', 95000, 'enterprise'),
  ('Strategic Software', 70000, 'enterprise'),
  ('Cloud Solutions Inc', 80000, 'enterprise'),
  ('Data Systems Pro', 65000, 'growth'),
  ('MegaCorp International', 120000, 'enterprise'),
  ('Enterprise Leaders', 150000, 'enterprise'),
  ('Global Tech Solutions', 180000, 'enterprise');

-- Add customer impacts
INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT
  i.id,
  'CUS' || floor(random() * 1000)::text,
  c.name,
  CASE 
    WHEN i.sentiment = 'negative' THEN c.base_acv
    WHEN i.sentiment = 'neutral' THEN c.base_acv * 0.5
    ELSE c.base_acv * 0.25
  END as acv_impact
FROM temp_insights i
CROSS JOIN temp_customers c
WHERE 
  -- Assign more customers to high-priority themes
  (i.theme_name IN ('Integration Issues', 'Security & Compliance') AND random() < 0.8)
  OR random() < 0.6;

-- Clean up temporary tables
DROP TABLE temp_insights;
DROP TABLE temp_customers;