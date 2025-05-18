/*
  # Add Sample Insights Data

  1. Changes
    - Create product area if none exists
    - Add sample themes with proper relationships
    - Add sample insights with varied content
    - Add customer impacts with realistic ACV values
  
  2. Data
    - Sample insights across different themes
    - Customer impacts with strategic distribution
    - Theme associations with confidence scores
*/

-- Create a product area if none exists
DO $$
DECLARE
  v_product_area_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  -- Check if user has any product areas
  SELECT id INTO v_product_area_id
  FROM product_areas
  WHERE user_id = v_user_id
  LIMIT 1;

  -- If no product area exists, create one
  IF v_product_area_id IS NULL THEN
    INSERT INTO product_areas (user_id, name, description)
    VALUES (v_user_id, 'Core Platform', 'Main product features and capabilities')
    RETURNING id INTO v_product_area_id;
  END IF;

  -- Insert themes if they don't exist
  INSERT INTO themes (
    name,
    description,
    priority_score,
    status,
    is_auto_generated,
    product_area_id,
    created_by
  )
  SELECT
    t.name,
    t.description,
    t.priority_score,
    'active',
    true,
    v_product_area_id,
    v_user_id
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
  ) AS t(name, description, priority_score)
  WHERE NOT EXISTS (
    SELECT 1 FROM themes 
    WHERE themes.name = t.name 
    AND themes.product_area_id = v_product_area_id
  );

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

  -- Clean up temporary tables
  DROP TABLE temp_insights;
  DROP TABLE temp_customers;
END $$;