-- Create temporary sequence for customer IDs
CREATE TEMPORARY SEQUENCE temp_customer_id START 1;

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
  -- Integration Issues
  (
    'OAuth token refresh is failing intermittently with third-party apps',
    'slack',
    'negative',
    'Integration Issues',
    auth.uid(),
    NOW() - interval '25 days'
  ),
  (
    'Need higher API concurrency limits for enterprise customers',
    'hubspot',
    'negative',
    'Integration Issues',
    auth.uid(),
    NOW() - interval '20 days'
  ),
  (
    'Integration with Microsoft Teams is working smoothly after the update',
    'slack',
    'positive',
    'Integration Issues',
    auth.uid(),
    NOW() - interval '5 days'
  ),

  -- Data Accuracy
  (
    'Customer data is not syncing in real-time, causing delays',
    'hubspot',
    'negative',
    'Data Accuracy',
    auth.uid(),
    NOW() - interval '28 days'
  ),
  (
    'Analytics dashboard shows incorrect MRR calculations',
    'document',
    'negative',
    'Data Accuracy',
    auth.uid(),
    NOW() - interval '15 days'
  ),
  (
    'New data validation rules have improved data quality significantly',
    'slack',
    'positive',
    'Data Accuracy',
    auth.uid(),
    NOW() - interval '3 days'
  ),

  -- Feature Requests
  (
    'Need ability to bulk import contacts from CSV',
    'hubspot',
    'neutral',
    'Feature Requests',
    auth.uid(),
    NOW() - interval '30 days'
  ),
  (
    'Customers requesting custom dashboard widgets',
    'slack',
    'neutral',
    'Feature Requests',
    auth.uid(),
    NOW() - interval '18 days'
  ),
  (
    'Advanced filtering options needed in reporting module',
    'document',
    'neutral',
    'Feature Requests',
    auth.uid(),
    NOW() - interval '7 days'
  ),

  -- User Experience
  (
    'New onboarding flow is much more intuitive',
    'hubspot',
    'positive',
    'User Experience',
    auth.uid(),
    NOW() - interval '22 days'
  ),
  (
    'Users finding it difficult to navigate between modules',
    'slack',
    'negative',
    'User Experience',
    auth.uid(),
    NOW() - interval '12 days'
  ),
  (
    'Mobile app performance has improved significantly',
    'document',
    'positive',
    'User Experience',
    auth.uid(),
    NOW() - interval '2 days'
  ),

  -- Security & Compliance
  (
    'Need SAML SSO support for enterprise customers',
    'hubspot',
    'neutral',
    'Security & Compliance',
    auth.uid(),
    NOW() - interval '27 days'
  ),
  (
    'Audit logs missing critical user actions',
    'document',
    'negative',
    'Security & Compliance',
    auth.uid(),
    NOW() - interval '14 days'
  ),
  (
    'New encryption standards implementation well received',
    'slack',
    'positive',
    'Security & Compliance',
    auth.uid(),
    NOW() - interval '4 days'
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
  base_acv integer,
  tier text
);

-- Insert customer data with explicit IDs
INSERT INTO temp_customers (id, name, base_acv, tier)
VALUES
  ('CUS001', 'Global Enterprise Corp', 250000, 'enterprise'),
  ('CUS002', 'Tech Innovators Inc', 180000, 'enterprise'),
  ('CUS003', 'Digital Solutions Ltd', 150000, 'enterprise'),
  ('CUS004', 'Future Systems Corp', 120000, 'enterprise'),
  ('CUS005', 'Cloud Leaders SA', 100000, 'enterprise'),
  ('CUS006', 'Smart Software Co', 80000, 'growth'),
  ('CUS007', 'Data Dynamics Ltd', 75000, 'growth'),
  ('CUS008', 'Agile Solutions Inc', 65000, 'growth'),
  ('CUS009', 'Tech Ventures LLC', 60000, 'growth'),
  ('CUS010', 'Innovation Hub Co', 50000, 'growth');

-- Insert customer impacts with strategic distribution
WITH numbered_insights AS (
  SELECT 
    id,
    sentiment,
    theme_name,
    ROW_NUMBER() OVER (
      PARTITION BY theme_name 
      ORDER BY created_at DESC
    ) as theme_rank
  FROM temp_insights
),
numbered_customers AS (
  SELECT 
    id as customer_id,
    name as customer_name,
    base_acv,
    ROW_NUMBER() OVER (ORDER BY base_acv DESC) as customer_rank
  FROM temp_customers
)
INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT DISTINCT ON (i.id, c.customer_id)
  i.id,
  c.customer_id,
  c.customer_name,
  CASE 
    WHEN i.sentiment = 'negative' THEN c.base_acv
    WHEN i.sentiment = 'neutral' THEN c.base_acv * 0.5
    ELSE c.base_acv * 0.25
  END as acv_impact
FROM numbered_insights i
CROSS JOIN numbered_customers c
WHERE 
  -- Ensure enterprise customers are linked to high-priority themes
  (i.theme_name IN ('Security & Compliance', 'Integration Issues') AND c.customer_rank <= 5)
  OR
  -- Distribute other customers across remaining insights
  (i.theme_name NOT IN ('Security & Compliance', 'Integration Issues') AND c.customer_rank > 5)
  OR
  -- Add some random distribution for variety
  random() < 0.3;

-- Add additional enterprise impacts for critical issues
INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT DISTINCT ON (i.id, c.id)
  i.id,
  c.id,
  c.name,
  c.base_acv
FROM temp_insights i
CROSS JOIN (
  SELECT * FROM temp_customers 
  WHERE base_acv >= 150000
) c
WHERE (
  i.content ILIKE '%api%' OR
  i.content ILIKE '%sso%' OR
  i.content ILIKE '%enterprise%' OR
  i.content ILIKE '%security%'
)
AND NOT EXISTS (
  SELECT 1 
  FROM insight_customers ic 
  WHERE ic.insight_id = i.id 
  AND ic.customer_id = c.id
);

-- Clean up temporary tables and sequences
DROP TABLE temp_insights;
DROP TABLE temp_customers;
DROP SEQUENCE temp_customer_id;