-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "pod_members_access_v8" ON pod_members;
DROP POLICY IF EXISTS "insights_access_v7" ON insights;
DROP POLICY IF EXISTS "insight_themes_access_v6" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access_v6" ON insight_customers;
DROP POLICY IF EXISTS "users_view_profiles_v5" ON user_profiles;

-- Create maximally simplified pod_members policy
CREATE POLICY "pod_members_access_v9"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. User is the member themselves
  user_id = auth.uid()
)
WITH CHECK (
  -- For insert/update:
  -- 1. Creating own owner membership
  user_id = auth.uid()
);

-- Create maximally simplified insights policy
CREATE POLICY "insights_access_v8"
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

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access_v7"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the associated insight
  -- 2. Has access to theme's product area
  EXISTS (
    SELECT 1 FROM insights WHERE id = insight_id AND created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM themes t
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE t.id = theme_id AND pa.user_id = auth.uid()
  )
);

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access_v7"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the associated insight
  EXISTS (
    SELECT 1 FROM insights WHERE id = insight_id AND created_by = auth.uid()
  )
);

-- Create simplified user_profiles policy
CREATE POLICY "users_view_profiles_v6"
ON user_profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Own profile
  id = auth.uid()
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);