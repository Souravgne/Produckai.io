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

-- Create simplified insights policies
CREATE POLICY "insights_select"
ON insights
FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
  created_by = auth.uid() OR
  id IN (
    SELECT DISTINCT i.id
    FROM insights i
    JOIN insight_themes it ON it.insight_id = i.id
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

-- Create simplified insight_themes policies
CREATE POLICY "insight_themes_select"
ON insight_themes
FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
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

CREATE POLICY "insight_themes_insert"
ON insight_themes
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow inserting if:
  -- 1. Created the insight
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

-- Create simplified insight_customers policies
CREATE POLICY "insight_customers_select"
ON insight_customers
FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
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
    WHERE i.id = insight_customers.insight_id
    AND pa.user_id = auth.uid()
  )
);

CREATE POLICY "insight_customers_insert"
ON insight_customers
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserting if:
  -- 1. Created the insight
  EXISTS (
    SELECT 1
    FROM insights i
    WHERE i.id = insight_id
    AND i.created_by = auth.uid()
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);