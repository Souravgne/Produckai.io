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

-- Create maximally simplified insights policy
CREATE POLICY "insights_access"
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

-- Create maximally simplified insight_themes policy
CREATE POLICY "insight_themes_access"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Theme belongs to user's product area
  theme_id IN (
    SELECT t.id
    FROM themes t
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

-- Create maximally simplified insight_customers policy
CREATE POLICY "insight_customers_access"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Insight was created by user
  insight_id IN (
    SELECT id FROM insights WHERE created_by = auth.uid()
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_customers_insight_id ON insight_customers(insight_id);