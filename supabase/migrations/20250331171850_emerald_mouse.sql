-- Drop existing restrictive policies
DROP POLICY IF EXISTS "insights_access_v15" ON insights;
DROP POLICY IF EXISTS "insight_themes_access_v14" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access_v14" ON insight_customers;

-- Create proper insights policy that allows access through product areas
CREATE POLICY "insights_access_v16"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE it.insight_id = insights.id
    AND pa.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create proper insight_themes policy
CREATE POLICY "insight_themes_access_v15"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. Created the associated insight
  -- 2. Has access to theme's product area
  EXISTS (
    SELECT 1
    FROM insights i
    WHERE i.id = insight_id
    AND i.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1
    FROM themes t
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE t.id = theme_id
    AND pa.user_id = auth.uid()
  )
);

-- Create proper insight_customers policy
CREATE POLICY "insight_customers_access_v15"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. Created the associated insight
  -- 2. Has access to insight through theme's product area
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
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE i.id = insight_id
    AND pa.user_id = auth.uid()
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);

-- Insert additional sample insights data
DO $$
DECLARE
  v_product_area_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  -- Get first product area ID
  SELECT id INTO v_product_area_id
  FROM product_areas
  WHERE user_id = v_user_id
  LIMIT 1;

  -- Create temporary table for insights
  CREATE TEMP TABLE temp_insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content text,
    source text,
    sentiment text,
    theme_name text,
    created_at timestamptz
  );

  -- Insert sample insights
  INSERT INTO temp_insights (content, source, sentiment, theme_name, created_at)
  VALUES
    -- Integration Issues
    (
      'OAuth token refresh is failing intermittently with third-party apps',
      'slack',
      'negative',
      'Integration Issues',
      NOW() - interval '25 days'
    ),
    (
      'Need higher API concurrency limits for enterprise customers',
      'hubspot',
      'negative',
      'Integration Issues',
      NOW() - interval '20 days'
    ),
    (
      'Integration with Microsoft Teams is working smoothly after the update',
      'slack',
      'positive',
      'Integration Issues',
      NOW() - interval '5 days'
    ),

    -- Data Accuracy
    (
      'Customer data is not syncing in real-time, causing delays',
      'hubspot',
      'negative',
      'Data Accuracy',
      NOW() - interval '28 days'
    ),
    (
      'Analytics dashboard shows incorrect MRR calculations',
      'document',
      'negative',
      'Data Accuracy',
      NOW() - interval '15 days'
    ),
    (
      'New data validation rules have improved data quality significantly',
      'slack',
      'positive',
      'Data Accuracy',
      NOW() - interval '3 days'
    ),

    -- Feature Requests
    (
      'Need ability to bulk import contacts from CSV',
      'hubspot',
      'neutral',
      'Feature Requests',
      NOW() - interval '30 days'
    ),
    (
      'Customers requesting custom dashboard widgets',
      'slack',
      'neutral',
      'Feature Requests',
      NOW() - interval '18 days'
    ),
    (
      'Advanced filtering options needed in reporting module',
      'document',
      'neutral',
      'Feature Requests',
      NOW() - interval '7 days'
    ),

    -- User Experience
    (
      'New onboarding flow is much more intuitive',
      'hubspot',
      'positive',
      'User Experience',
      NOW() - interval '22 days'
    ),
    (
      'Users finding it difficult to navigate between modules',
      'slack',
      'negative',
      'User Experience',
      NOW() - interval '12 days'
    ),
    (
      'Mobile app performance has improved significantly',
      'document',
      'positive',
      'User Experience',
      NOW() - interval '2 days'
    ),

    -- Security & Compliance
    (
      'Need SAML SSO support for enterprise customers',
      'hubspot',
      'neutral',
      'Security & Compliance',
      NOW() - interval '27 days'
    ),
    (
      'Audit logs missing critical user actions',
      'document',
      'negative',
      'Security & Compliance',
      NOW() - interval '14 days'
    ),
    (
      'New encryption standards implementation well received',
      'slack',
      'positive',
      'Security & Compliance',
      NOW() - interval '4 days'
    );

  -- Insert insights
  INSERT INTO insights (id, content, source, sentiment, created_by, created_at)
  SELECT 
    id,
    content,
    source,
    sentiment,
    v_user_id,
    created_at
  FROM temp_insights
  WHERE NOT EXISTS (
    SELECT 1 FROM insights 
    WHERE insights.content = temp_insights.content
    AND insights.created_by = v_user_id
  );

  -- Link insights to themes
  INSERT INTO insight_themes (insight_id, theme_id, confidence_score)
  SELECT DISTINCT ON (i.id, t.id)
    i.id,
    t.id,
    0.8 + random() * 0.2
  FROM temp_insights i
  JOIN themes t ON t.name = i.theme_name AND t.product_area_id = v_product_area_id
  WHERE NOT EXISTS (
    SELECT 1 FROM insight_themes
    WHERE insight_id = i.id AND theme_id = t.id
  );

  -- Create temporary table for customers
  CREATE TEMP TABLE temp_customers (
    id text PRIMARY KEY,
    name text,
    base_acv integer,
    tier text
  );

  -- Insert customer data
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

  -- Insert customer impacts
  INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
  SELECT DISTINCT ON (i.id, c.id)
    i.id,
    c.id,
    c.name,
    CASE 
      WHEN i.sentiment = 'negative' THEN c.base_acv
      WHEN i.sentiment = 'neutral' THEN c.base_acv * 0.5
      ELSE c.base_acv * 0.25
    END
  FROM temp_insights i
  CROSS JOIN temp_customers c
  WHERE NOT EXISTS (
    SELECT 1 FROM insight_customers ic
    WHERE ic.insight_id = i.id AND ic.customer_id = c.id
  )
  AND random() < 0.7;

  -- Add high-priority customer impacts
  INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
  SELECT DISTINCT ON (i.id, c.id)
    i.id,
    c.id,
    c.name,
    c.base_acv
  FROM temp_insights i
  CROSS JOIN (
    SELECT * FROM temp_customers WHERE base_acv >= 150000
  ) c
  WHERE (
    i.content ILIKE '%api%' OR
    i.content ILIKE '%sso%' OR
    i.content ILIKE '%enterprise%' OR
    i.content ILIKE '%security%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM insight_customers ic
    WHERE ic.insight_id = i.id AND ic.customer_id = c.id
  );

  -- Clean up temporary tables
  DROP TABLE temp_insights;
  DROP TABLE temp_customers;
END $$;