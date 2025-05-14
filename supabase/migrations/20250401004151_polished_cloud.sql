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
    base_acv integer
  );

  -- Insert customer data
  INSERT INTO temp_customers (id, name, base_acv)
  VALUES
    ('CUS001', 'Acme Corporation', 50000),
    ('CUS002', 'TechCorp Solutions', 75000),
    ('CUS003', 'Global Industries', 100000),
    ('CUS004', 'Innovative Systems', 60000),
    ('CUS005', 'Enterprise Solutions Ltd', 85000);

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
  );

  -- Clean up temporary tables
  DROP TABLE temp_insights;
  DROP TABLE temp_customers;
END $$;