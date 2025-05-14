/*
  # Seed insights data
  
  1. Changes
    - Add realistic customer feedback data
    - Link insights to existing themes
    - Include customer impact data
    - Add varied feedback sources and sentiments
  
  2. Data Categories
    - Integration feedback
    - Feature requests
    - User experience
    - Security concerns
    - Performance issues
*/

-- Insert insights data
INSERT INTO insights (
  id,
  content,
  source,
  sentiment,
  created_by,
  created_at
)
SELECT
  gen_random_uuid(),
  content,
  source,
  sentiment,
  (SELECT auth.uid()),
  NOW() - (random() * interval '30 days')
FROM (
  VALUES
    (
      'Syncing contacts with Salesforce often fails and delays our campaigns. This is causing significant delays in our marketing efforts.',
      'slack',
      'negative'
    ),
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
    )
) AS i(content, source, sentiment);

-- Link insights to themes
INSERT INTO insight_themes (
  insight_id,
  theme_id,
  confidence_score
)
SELECT 
  i.id,
  t.id,
  0.8 + random() * 0.2  -- Random score between 0.8 and 1.0
FROM insights i
CROSS JOIN LATERAL (
  SELECT id 
  FROM themes 
  WHERE name = 
    CASE 
      WHEN i.content ILIKE '%sync%' OR i.content ILIKE '%salesforce%' OR i.content ILIKE '%api%' 
        THEN 'Integration Issues'
      WHEN i.content ILIKE '%dashboard%' OR i.content ILIKE '%layout%' OR i.content ILIKE '%mobile%' 
        THEN 'User Experience'
      WHEN i.content ILIKE '%upload%' OR i.content ILIKE '%feature%' OR i.content ILIKE '%filtering%' 
        THEN 'Feature Requests'
      WHEN i.content ILIKE '%sso%' OR i.content ILIKE '%security%' 
        THEN 'Security & Compliance'
      ELSE 'Data Accuracy'
    END
  LIMIT 1
) t;

-- Add customer impact data
INSERT INTO insight_customers (
  insight_id,
  customer_id,
  customer_name,
  acv_impact
)
SELECT
  i.id,
  'CUS' || floor(random() * 1000)::text,
  customer_name,
  acv_impact
FROM insights i
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
WHERE random() < 0.7;  -- 70% chance of adding customer impact

-- Add additional customer impacts for high-priority insights
INSERT INTO insight_customers (
  insight_id,
  customer_id,
  customer_name,
  acv_impact
)
SELECT
  i.id,
  'CUS' || floor(random() * 1000)::text,
  customer_name,
  acv_impact
FROM insights i
CROSS JOIN LATERAL (
  VALUES
    ('MegaCorp International', 120000),
    ('Enterprise Leaders', 150000),
    ('Global Tech Solutions', 180000)
) AS c(customer_name, acv_impact)
WHERE i.content ILIKE '%api%' 
   OR i.content ILIKE '%sso%'
   OR i.content ILIKE '%sync%';