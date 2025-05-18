-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "insights_access_v20" ON insights;
DROP POLICY IF EXISTS "insight_themes_access_v19" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access_v19" ON insight_customers;

-- Create maximally simplified insights policy
CREATE POLICY "insights_access_final"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Created the insight
  -- 2. Has access to theme's product area (via direct join)
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM product_areas pa
    WHERE pa.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM themes t
      JOIN insight_themes it ON it.theme_id = t.id
      WHERE t.product_area_id = pa.id
      AND it.insight_id = insights.id
    )
  )
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access_final"
ON insight_themes
AS PERMISSIVE FOR ALL
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

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access_final"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
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