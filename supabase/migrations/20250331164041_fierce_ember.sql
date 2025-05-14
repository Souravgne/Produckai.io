-- Create default user and seed initial data
DO $$
DECLARE
  v_product_area_id uuid;
  v_user_id uuid;
BEGIN
  -- Create a default user first
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'default@example.com',
    crypt('default-password', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Set the user ID
  v_user_id := '00000000-0000-0000-0000-000000000000';

  -- Create user profile if it doesn't exist
  INSERT INTO user_profiles (id, role, department)
  VALUES (v_user_id, 'admin', 'product')
  ON CONFLICT (id) DO NOTHING;

  -- Create product area if none exists
  INSERT INTO product_areas (user_id, name, description)
  VALUES (v_user_id, 'Core Platform', 'Main product features and capabilities')
  RETURNING id INTO v_product_area_id;

  -- Insert themes
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
      ('Integration Issues', 'Issues related to third-party integrations and sync failures', 85),
      ('Data Accuracy', 'Concerns about data quality and outdated information', 65),
      ('Feature Requests', 'New feature requests from customers', 90),
      ('User Experience', 'Feedback about the user interface and navigation', 60),
      ('Security & Compliance', 'Security requirements and compliance-related requests', 95)
  ) AS t(name, description, priority_score);

  -- Insert insights
  WITH inserted_insights AS (
    INSERT INTO insights (content, source, sentiment, created_by)
    VALUES
      ('API rate limits are too restrictive for enterprise usage', 'slack', 'negative', v_user_id),
      ('Syncing contacts with Salesforce often fails', 'slack', 'negative', v_user_id),
      ('Data inconsistencies between systems', 'hubspot', 'negative', v_user_id),
      ('The new dashboard layout is intuitive', 'hubspot', 'positive', v_user_id),
      ('Mobile app crashes frequently', 'slack', 'negative', v_user_id),
      ('Navigation is much smoother now', 'document', 'positive', v_user_id)
    RETURNING id, content, sentiment
  )
  -- Link insights to themes
  INSERT INTO insight_themes (insight_id, theme_id, confidence_score)
  SELECT 
    i.id,
    t.id,
    0.8 + random() * 0.2
  FROM inserted_insights i
  CROSS JOIN (
    SELECT id, name FROM themes 
    WHERE product_area_id = v_product_area_id
  ) t
  WHERE 
    (t.name = 'Integration Issues' AND i.content ILIKE '%api%')
    OR (t.name = 'Integration Issues' AND i.content ILIKE '%sync%')
    OR (t.name = 'Data Accuracy' AND i.content ILIKE '%data%')
    OR (t.name = 'User Experience' AND i.content ILIKE '%layout%')
    OR (t.name = 'User Experience' AND i.content ILIKE '%navigation%')
    OR (t.name = 'User Experience' AND i.content ILIKE '%crashes%');

  -- Insert customer impacts
  INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
  SELECT
    i.id,
    'CUS' || LPAD(ROW_NUMBER() OVER (ORDER BY i.id)::text, 3, '0'),
    c.name,
    CASE 
      WHEN i.sentiment = 'negative' THEN c.acv
      WHEN i.sentiment = 'neutral' THEN c.acv * 0.5
      ELSE c.acv * 0.25
    END
  FROM insights i
  CROSS JOIN (
    VALUES
      ('Acme Corporation', 50000),
      ('TechCorp Solutions', 75000),
      ('Global Industries', 100000),
      ('Innovative Systems', 60000),
      ('Enterprise Solutions Ltd', 85000)
  ) AS c(name, acv)
  WHERE i.created_by = v_user_id;
END $$;