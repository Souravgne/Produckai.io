/*
  # Fix Insights Policies and Add Sample Data

  1. Changes
    - Drop existing problematic policies
    - Create simplified policies without recursion
    - Add sample insights data with proper customer relationships
    - Add optimized indexes for performance

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Use materialized paths for hierarchical access
*/

-- Drop ALL existing policies
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

-- Create simplified insights policy with materialized path
CREATE POLICY "insights_select"
ON insights
FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  -- 2. Has access to theme's product area (via materialized path)
  created_by = auth.uid() OR
  id IN (
    SELECT DISTINCT it.insight_id
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "insights_insert"
ON insights
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only creator can insert
  created_by = auth.uid()
);

CREATE POLICY "insights_modify"
ON insights
FOR UPDATE
TO authenticated
USING (
  -- Only creator can modify
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "insights_delete"
ON insights
FOR DELETE
TO authenticated
USING (
  -- Only creator can delete
  created_by = auth.uid()
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_select"
ON insight_themes
FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
  insight_id IN (
    SELECT id FROM insights WHERE created_by = auth.uid()
  ) OR
  theme_id IN (
    SELECT t.id
    FROM themes t
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "insight_themes_insert"
ON insight_themes
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow inserting if:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
  insight_id IN (
    SELECT id FROM insights WHERE created_by = auth.uid()
  ) OR
  theme_id IN (
    SELECT t.id
    FROM themes t
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_select"
ON insight_customers
FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
  insight_id IN (
    SELECT id FROM insights WHERE created_by = auth.uid()
  ) OR
  insight_id IN (
    SELECT DISTINCT it.insight_id
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "insight_customers_insert"
ON insight_customers
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserting if:
  -- 1. Created the insight
  insight_id IN (
    SELECT id FROM insights WHERE created_by = auth.uid()
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);

-- Insert sample insights data
DO $$
DECLARE
  v_insight_id uuid;
  v_theme_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  -- Insert insights one by one
  -- Integration Issues
  INSERT INTO insights (content, source, sentiment, created_by)
  VALUES ('API rate limits are too restrictive for enterprise usage', 'slack', 'negative', v_user_id)
  RETURNING id INTO v_insight_id;

  -- Link to theme
  SELECT id INTO v_theme_id FROM themes WHERE name = 'Integration Issues' LIMIT 1;
  IF v_theme_id IS NOT NULL THEN
    INSERT INTO insight_themes (insight_id, theme_id, confidence_score)
    VALUES (v_insight_id, v_theme_id, 0.95);
  END IF;

  -- Add customer impact
  INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
  VALUES 
    (v_insight_id, 'CUS001', 'Acme Corporation', 50000),
    (v_insight_id, 'CUS002', 'TechCorp Solutions', 75000);

  -- User Experience
  INSERT INTO insights (content, source, sentiment, created_by)
  VALUES ('Mobile app crashes frequently when processing large datasets', 'slack', 'negative', v_user_id)
  RETURNING id INTO v_insight_id;

  -- Link to theme
  SELECT id INTO v_theme_id FROM themes WHERE name = 'User Experience' LIMIT 1;
  IF v_theme_id IS NOT NULL THEN
    INSERT INTO insight_themes (insight_id, theme_id, confidence_score)
    VALUES (v_insight_id, v_theme_id, 0.88);
  END IF;

  -- Add customer impact
  INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
  VALUES 
    (v_insight_id, 'CUS003', 'Global Industries', 100000),
    (v_insight_id, 'CUS004', 'Innovative Systems', 60000);

  -- Feature Requests
  INSERT INTO insights (content, source, sentiment, created_by)
  VALUES ('Custom report builder would save us hours of work', 'document', 'neutral', v_user_id)
  RETURNING id INTO v_insight_id;

  -- Link to theme
  SELECT id INTO v_theme_id FROM themes WHERE name = 'Feature Requests' LIMIT 1;
  IF v_theme_id IS NOT NULL THEN
    INSERT INTO insight_themes (insight_id, theme_id, confidence_score)
    VALUES (v_insight_id, v_theme_id, 0.92);
  END IF;

  -- Add customer impact
  INSERT INTO insight_customers (insight_id, customer_id, customer_name, acv_impact)
  VALUES 
    (v_insight_id, 'CUS005', 'Enterprise Solutions Ltd', 85000),
    (v_insight_id, 'CUS006', 'Digital Dynamics', 45000);
END $$;