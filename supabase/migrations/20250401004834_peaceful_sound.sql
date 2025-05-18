-- Drop ALL existing policies
DROP POLICY IF EXISTS "insights_access_final_v17" ON insights;
DROP POLICY IF EXISTS "insight_themes_access_final_v17" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access_final_v17" ON insight_customers;

-- Create maximally simplified insights policy with no recursion
CREATE POLICY "insights_access_final_v18"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Created the insight
  created_by = auth.uid()
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create simplified insight_themes policy with no recursion
CREATE POLICY "insight_themes_access_final_v18"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
  EXISTS (
    SELECT 1 FROM insights WHERE id = insight_id AND created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM themes t
    WHERE t.id = theme_id
    AND t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

-- Create simplified insight_customers policy with no recursion
CREATE POLICY "insight_customers_access_final_v18"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Created the insight
  EXISTS (
    SELECT 1 FROM insights WHERE id = insight_id AND created_by = auth.uid()
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);