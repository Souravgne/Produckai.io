-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "insights_access" ON insights;
DROP POLICY IF EXISTS "insights_access_v2" ON insights;
DROP POLICY IF EXISTS "insights_access_v3" ON insights;
DROP POLICY IF EXISTS "insights_access_v4" ON insights;
DROP POLICY IF EXISTS "insights_select_v2" ON insights;
DROP POLICY IF EXISTS "insights_insert_v2" ON insights;
DROP POLICY IF EXISTS "insights_modify_v2" ON insights;
DROP POLICY IF EXISTS "insights_delete_v2" ON insights;

-- Create maximally simplified insights policies
CREATE POLICY "insights_select_v3"
ON insights
FOR SELECT
TO authenticated
USING (
  -- Direct ownership check only:
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

CREATE POLICY "insights_insert_v3"
ON insights
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only creator can insert
  created_by = auth.uid()
);

CREATE POLICY "insights_modify_v3"
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

CREATE POLICY "insights_delete_v3"
ON insights
FOR DELETE
TO authenticated
USING (
  -- Only creator can delete
  created_by = auth.uid()
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);