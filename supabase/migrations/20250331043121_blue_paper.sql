/*
  # Add sample insights data

  1. Changes
    - Insert sample insights with unique IDs
    - Link insights to themes based on content
    - Add customer impact data
    - Ensure no duplicate records
  
  2. Data
    - 10 sample insights across different themes
    - Customer impact data with varying ACV values
    - Theme assignments based on content analysis
*/

-- Create temporary table for new insights
CREATE TEMP TABLE temp_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text,
  source text,
  sentiment text,
  created_by uuid,
  created_at timestamptz
);

-- Insert sample insights into temporary table
INSERT INTO temp_insights (content, source, sentiment, created_by, created_at)
SELECT
  content,
  source,
  sentiment,
  (SELECT auth.uid()),
  NOW() - (random() * interval '30 days')
FROM (
  VALUES
    (
      'The new dashboard layout is much more intuitive. Really loving the quick access to key metrics.',
      'hubspot',
      'positive'
    ),
    (
      'We need a bulk upload feature for contacts. Currently spending hours on manual data entry.',
      'slack',
      'negative'
    ),
    (
      'SSO integration with Okta would be a game-changer for our security team.',
      'hubspot',
      'neutral'
    ),
    (
      'API rate limits are too restrictive for our enterprise usage. Need higher limits.',
      'slack',
      'negative'
    ),
    (
      'Great improvement on the export functionality. Much faster than before!',
      'hubspot',
      'positive'
    ),
    (
      'Mobile app crashes frequently when processing large datasets.',
      'slack',
      'negative'
    ),
    (
      'Would love to see better filtering options in the analytics dashboard.',
      'hubspot',
      'neutral'
    ),
    (
      'Data inconsistencies between Salesforce and your platform are causing major headaches.',
      'slack',
      'negative'
    ),
    (
      'The new automation features have saved us hours of manual work. Excellent addition!',
      'hubspot',
      'positive'
    ),
    (
      'Search functionality is too basic. Need advanced filters and saved searches.',
      'document',
      'negative'
    )
) AS i(content, source, sentiment);

-- Insert insights from temporary table to actual table
INSERT INTO insights (id, content, source, sentiment, created_by, created_at)
SELECT id, content, source, sentiment, created_by, created_at
FROM temp_insights;

-- Create temporary table for theme mappings
CREATE TEMP TABLE temp_theme_mappings AS
SELECT 
  i.id as insight_id,
  t.id as theme_id,
  0.8 + random() * 0.2 as confidence_score
FROM temp_insights i
CROSS JOIN LATERAL (
  SELECT id 
  FROM themes 
  WHERE name = 
    CASE 
      WHEN i.content ILIKE '%dashboard%' OR i.content ILIKE '%layout%' OR i.content ILIKE '%mobile%' 
        THEN 'User Experience'
      WHEN i.content ILIKE '%upload%' OR i.content ILIKE '%feature%' OR i.content ILIKE '%filtering%' 
        THEN 'Feature Requests'
      WHEN i.content ILIKE '%sso%' OR i.content ILIKE '%security%' 
        THEN 'Security & Compliance'
      WHEN i.content ILIKE '%api%' OR i.content ILIKE '%salesforce%' OR i.content ILIKE '%sync%' 
        THEN 'Integration Issues'
      ELSE 'Data Accuracy'
    END
  LIMIT 1
) t;

-- Insert theme mappings
INSERT INTO insight_themes (insight_id, theme_id, confidence_score)
SELECT insight_id, theme_id, confidence_score
FROM temp_theme_mappings;

-- Create temporary table for customer impacts
CREATE TEMP TABLE temp_customer_impacts AS
SELECT
  i.id as insight_id,
  'CUS' || floor(random() * 1000)::text as customer_id,
  c.customer_name,
  c.acv_impact
FROM temp_insights i
CROSS JOIN LATERAL (
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
    ('Data Systems Pro', 65000)
) AS c(customer_name, acv_impact)
WHERE random() < 0.7;

-- Insert customer impacts
INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT insight_id, customer_id, customer_name, acv_impact
FROM temp_customer_impacts;

-- Add additional high-priority customer impacts
INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT
  i.id,
  'CUS' || floor(random() * 1000)::text,
  c.customer_name,
  c.acv_impact
FROM temp_insights i
CROSS JOIN LATERAL (
  VALUES
    ('MegaCorp International', 120000),
    ('Enterprise Leaders', 150000),
    ('Global Tech Solutions', 180000)
) AS c(customer_name, acv_impact)
WHERE i.content ILIKE '%api%' 
   OR i.content ILIKE '%sso%'
   OR i.content ILIKE '%sync%';

-- Clean up temporary tables
DROP TABLE temp_insights;
DROP TABLE temp_theme_mappings;
DROP TABLE temp_customer_impacts;