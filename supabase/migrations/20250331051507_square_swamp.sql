/*
  # Add sample insights data with unique customer relationships
  
  1. Changes
    - Add realistic insights with theme associations
    - Add customer impact data with unique combinations
    - Ensure no duplicate customer-insight relationships
  
  2. Data
    - Insights across different themes
    - Customer impact data with realistic ACV values
    - Theme associations with confidence scores
*/

-- Create temporary table for insights
CREATE TEMP TABLE temp_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text,
  source text,
  sentiment text,
  theme_name text,
  created_by uuid,
  created_at timestamptz
);

-- Insert sample insights with explicit theme assignments
INSERT INTO temp_insights (content, source, sentiment, theme_name, created_by, created_at)
VALUES
  -- Integration Issues theme
  (
    'API rate limits are too restrictive for enterprise usage. Need higher limits.',
    'slack',
    'negative',
    'Integration Issues',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Syncing contacts with Salesforce often fails and delays our campaigns.',
    'slack',
    'negative',
    'Integration Issues',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Data inconsistencies between systems are causing major headaches.',
    'hubspot',
    'negative',
    'Integration Issues',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  
  -- User Experience theme
  (
    'The new dashboard layout is much more intuitive. Love the quick access.',
    'hubspot',
    'positive',
    'User Experience',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Mobile app crashes frequently when processing large datasets.',
    'slack',
    'negative',
    'User Experience',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Navigation is much smoother after the recent update.',
    'document',
    'positive',
    'User Experience',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),

  -- Feature Requests theme
  (
    'We need a bulk upload feature for contacts. Manual entry is time-consuming.',
    'slack',
    'negative',
    'Feature Requests',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Would love to see better filtering options in the analytics dashboard.',
    'hubspot',
    'neutral',
    'Feature Requests',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Custom report builder would save us hours of work.',
    'document',
    'neutral',
    'Feature Requests',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),

  -- Security & Compliance theme
  (
    'SSO integration with Okta would be a game-changer for security.',
    'hubspot',
    'neutral',
    'Security & Compliance',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Need better audit logs for compliance reporting.',
    'slack',
    'negative',
    'Security & Compliance',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Data encryption at rest should be enabled by default.',
    'document',
    'neutral',
    'Security & Compliance',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),

  -- Data Accuracy theme
  (
    'Real-time data sync would prevent most accuracy issues.',
    'slack',
    'negative',
    'Data Accuracy',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Duplicate detection needs improvement.',
    'hubspot',
    'negative',
    'Data Accuracy',
    (SELECT auth.uid()),
    NOW() - (random() * interval '30 days')
  ),
  (
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

-- Create temporary table for customer assignments
CREATE TEMP TABLE temp_customer_assignments (
  insight_id uuid,
  customer_name text,
  acv_impact numeric
);

-- Insert customer assignments
INSERT INTO temp_customer_assignments (insight_id, customer_name, acv_impact)
SELECT 
  i.id,
  c.name,
  CASE 
    WHEN i.sentiment = 'negative' THEN c.base_acv
    WHEN i.sentiment = 'neutral' THEN c.base_acv * 0.5
    ELSE c.base_acv * 0.25
  END as acv_impact
FROM temp_insights i
CROSS JOIN (
  VALUES
    ('Acme Corporation', 50000),
    ('TechCorp Solutions', 75000),
    ('Global Industries', 100000),
    ('Innovative Systems', 60000),
    ('Enterprise Solutions Ltd', 85000),
    ('Digital Dynamics', 45000),
    ('Future Technologies', 95000),
    ('Strategic Software', 70000),
    ('Cloud Solutions Inc', 80000),
    ('Data Systems Pro', 65000),
    ('MegaCorp International', 120000),
    ('Enterprise Leaders', 150000),
    ('Global Tech Solutions', 180000)
) as c(name, base_acv)
WHERE random() < 0.3; -- 30% chance of assigning each customer to each insight

-- Insert customer impacts with unique IDs
INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT 
  a.insight_id,
  'CUS' || LPAD(ROW_NUMBER() OVER (ORDER BY a.insight_id, a.customer_name)::text, 3, '0'),
  a.customer_name,
  a.acv_impact
FROM temp_customer_assignments a;

-- Clean up temporary tables
DROP TABLE temp_insights;
DROP TABLE temp_customer_assignments;