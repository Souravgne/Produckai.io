/*
  # Fix insights data access and seeding

  1. Changes
    - Simplify RLS policies to ensure proper data access
    - Add sample insights data with proper relationships
    - Ensure unique customer IDs per insight
  
  2. Security
    - Maintain proper access control
    - Prevent policy recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "insights_access" ON insights;
DROP POLICY IF EXISTS "insights_select" ON insights;
DROP POLICY IF EXISTS "insights_insert" ON insights;
DROP POLICY IF EXISTS "insights_modify" ON insights;
DROP POLICY IF EXISTS "insights_delete" ON insights;
DROP POLICY IF EXISTS "insight_themes_access" ON insight_themes;
DROP POLICY IF EXISTS "insight_themes_select" ON insight_themes;
DROP POLICY IF EXISTS "insight_themes_insert" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access" ON insight_customers;
DROP POLICY IF EXISTS "insight_customers_select" ON insight_customers;
DROP POLICY IF EXISTS "insight_customers_insert" ON insight_customers;

-- Create simplified insights policy
CREATE POLICY "insights_access"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User created the insight
  -- 2. User owns the product area of any associated theme
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    WHERE it.insight_id = insights.id
    AND t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User created the associated insight
  -- 2. User owns the theme's product area
  EXISTS (
    SELECT 1
    FROM insights i
    WHERE i.id = insight_id
    AND i.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1
    FROM themes t
    WHERE t.id = theme_id
    AND t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User created the associated insight
  -- 2. User owns the theme's product area
  EXISTS (
    SELECT 1
    FROM insights i
    WHERE i.id = insight_id
    AND i.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1
    FROM insights i
    JOIN insight_themes it ON it.insight_id = i.id
    JOIN themes t ON t.id = it.theme_id
    WHERE i.id = insight_customers.insight_id
    AND t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
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

-- Insert sample insights with explicit theme assignments
INSERT INTO temp_insights (content, source, sentiment, theme_name, created_by, created_at)
VALUES
  -- Integration Issues theme
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
  
  -- User Experience theme
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

-- Add customer impacts
INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
SELECT
  i.id,
  'CUS' || LPAD(ROW_NUMBER() OVER (ORDER BY i.id, c.name)::text, 3, '0'),
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
    ('Enterprise Solutions Ltd', 85000)
) as c(name, base_acv)
WHERE random() < 0.7;

-- Clean up
DROP TABLE temp_insights;