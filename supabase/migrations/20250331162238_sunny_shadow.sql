/*
  # Add sample data with unique customer IDs
  
  1. Changes
    - Add sample themes with descriptions
    - Add sample insights with proper relationships
    - Add customer impact data with unique IDs
    - Ensure no duplicate customer IDs
*/

-- Create temporary sequence for customer IDs
CREATE TEMPORARY SEQUENCE temp_customer_id START 1;

-- Insert sample themes data if they don't exist
INSERT INTO themes (
  name,
  description,
  priority_score,
  status,
  is_auto_generated,
  product_area_id
)
SELECT
  themes.name,
  themes.description,
  themes.priority_score,
  'active' as status,
  true as is_auto_generated,
  (SELECT id FROM product_areas LIMIT 1) as product_area_id
FROM (
  VALUES
    (
      'Integration Issues',
      'Issues related to third-party integrations and sync failures',
      85
    ),
    (
      'Data Accuracy',
      'Concerns about data quality and outdated information',
      65
    ),
    (
      'Feature Requests',
      'New feature requests from customers',
      90
    ),
    (
      'User Experience',
      'Feedback about the user interface and navigation',
      60
    ),
    (
      'Security & Compliance',
      'Security requirements and compliance-related requests',
      95
    )
) as themes(name, description, priority_score)
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE themes.name = themes.name
);

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

-- Insert sample insights with theme assignments
INSERT INTO temp_insights (content, source, sentiment, theme_name, created_by, created_at)
VALUES
  (
    'API rate limits are too restrictive for enterprise usage. Need higher limits.',
    'slack',
    'negative',
    'Integration Issues',
    auth.uid(),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Syncing contacts with Salesforce often fails and delays our campaigns.',
    'slack',
    'negative',
    'Integration Issues',
    auth.uid(),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Data inconsistencies between systems are causing major headaches.',
    'hubspot',
    'negative',
    'Integration Issues',
    auth.uid(),
    NOW() - (random() * interval '30 days')
  ),
  (
    'The new dashboard layout is much more intuitive. Love the quick access.',
    'hubspot',
    'positive',
    'User Experience',
    auth.uid(),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Mobile app crashes frequently when processing large datasets.',
    'slack',
    'negative',
    'User Experience',
    auth.uid(),
    NOW() - (random() * interval '30 days')
  ),
  (
    'Navigation is much smoother after the recent update.',
    'document',
    'positive',
    'User Experience',
    auth.uid(),
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
  id text PRIMARY KEY,
  name text,
  base_acv integer
);

-- Insert customer data with explicit IDs
INSERT INTO temp_customers (id, name, base_acv)
VALUES
  ('CUS' || lpad(nextval('temp_customer_id')::text, 3, '0'), 'Acme Corporation', 50000),
  ('CUS' || lpad(nextval('temp_customer_id')::text, 3, '0'), 'TechCorp Solutions', 75000),
  ('CUS' || lpad(nextval('temp_customer_id')::text, 3, '0'), 'Global Industries', 100000),
  ('CUS' || lpad(nextval('temp_customer_id')::text, 3, '0'), 'Innovative Systems', 60000),
  ('CUS' || lpad(nextval('temp_customer_id')::text, 3, '0'), 'Enterprise Solutions Ltd', 85000);

-- Insert customer impacts with guaranteed unique IDs
INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT
  i.id,
  c.id,
  c.name,
  CASE 
    WHEN i.sentiment = 'negative' THEN c.base_acv
    WHEN i.sentiment = 'neutral' THEN c.base_acv * 0.5
    ELSE c.base_acv * 0.25
  END as acv_impact
FROM temp_insights i
CROSS JOIN temp_customers c
WHERE random() < 0.7;

-- Add additional high-priority customer impacts
INSERT INTO temp_customers (id, name, base_acv)
VALUES
  ('CUS' || lpad(nextval('temp_customer_id')::text, 3, '0'), 'Enterprise Plus Corp', 200000),
  ('CUS' || lpad(nextval('temp_customer_id')::text, 3, '0'), 'Global Tech Leaders', 250000),
  ('CUS' || lpad(nextval('temp_customer_id')::text, 3, '0'), 'Mega Solutions Inc', 300000);

INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT DISTINCT ON (i.id, c.name)
  i.id,
  c.id,
  c.name,
  c.base_acv
FROM temp_insights i
CROSS JOIN (
  SELECT * FROM temp_customers 
  WHERE base_acv >= 200000
) c
WHERE (
  i.content ILIKE '%api%' OR
  i.content ILIKE '%sso%' OR
  i.content ILIKE '%sync%'
)
AND NOT EXISTS (
  SELECT 1 
  FROM insight_customers ic 
  WHERE ic.insight_id = i.id 
  AND ic.customer_name = c.name
);

-- Clean up temporary tables and sequences
DROP TABLE temp_insights;
DROP TABLE temp_customers;
DROP SEQUENCE temp_customer_id;