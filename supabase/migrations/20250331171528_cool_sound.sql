-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "insights_access_v13" ON insights;
DROP POLICY IF EXISTS "insight_themes_access_v12" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access_v12" ON insight_customers;

-- Create simplified insights policy without recursion
CREATE POLICY "insights_access_v14"
ON insights
AS PERMISSIVE FOR ALL
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
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access_v13"
ON insight_themes
AS PERMISSIVE FOR ALL
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

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access_v13"
ON insight_customers
AS PERMISSIVE FOR ALL
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

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);